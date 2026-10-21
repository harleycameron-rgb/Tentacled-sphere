"""Opt-in real Chromium checks using the installed WebDriver, not DOM mocks."""
import json
import os
import shutil
import socket
import subprocess
import threading
import time
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from scripts.build_web import INTERFACES
from scripts.dev_server import WebHandler


@unittest.skipUnless(os.environ.get("RUN_BROWSER") == "1" and shutil.which("chromedriver"),
                     "Set RUN_BROWSER=1 with Chromium/chromedriver installed")
class InvariantBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), WebHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        cls.driver_url = f"http://127.0.0.1:{port}"
        cls.driver = subprocess.Popen(
            ["chromedriver", f"--port={port}"], stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                with urlopen(cls.driver_url + "/status", timeout=1):
                    break
            except OSError:
                time.sleep(.05)
        capabilities = {"capabilities": {"alwaysMatch": {
            "browserName": "chrome",
            "goog:chromeOptions": {"args": ["--headless=new", "--no-sandbox",
                                          "--disable-dev-shm-usage"]},
        }}}
        value = cls.request("POST", "/session", capabilities)
        cls.session_path = "/session/" + value["sessionId"]
        cls.request("POST", cls.session_path + "/window/rect",
                    {"width": 1280, "height": 1000})

    @classmethod
    def request(cls, method, path, data=None):
        body = None if data is None else json.dumps(data).encode()
        request = Request(cls.driver_url + path, data=body, method=method,
                          headers={"Content-Type": "application/json"})
        try:
            with urlopen(request, timeout=30) as response:
                result = json.load(response)["value"]
        except HTTPError as error:
            raise AssertionError(error.read().decode()) from error
        if isinstance(result, dict) and "error" in result:
            raise AssertionError(result)
        return result

    def command(self, method, path, data=None):
        return self.request(method, self.session_path + path, data)

    def script(self, source, *args):
        return self.command("POST", "/execute/sync", {"script": source, "args": list(args)})

    def wait(self, source):
        for _ in range(100):
            result = self.script(source)
            if result:
                return result
            time.sleep(.05)
        self.fail("Browser condition timed out: " + source + "\n" + str(self.script(
            "return document.getElementById('status')?.textContent")))

    def navigate(self, route):
        self.command("POST", "/url", {"url": self.base + route})
        self.wait("return document.getElementById('workspace')?.children.length > 0")

    @classmethod
    def tearDownClass(cls):
        try:
            cls.request("DELETE", cls.session_path)
        finally:
            cls.driver.terminate()
            cls.driver.wait(timeout=10)
            cls.server.shutdown()
            cls.server.server_close()
            cls.thread.join()

    def test_six_direct_routes_sources_assets_and_coordinate_boundary(self):
        for interface in INTERFACES:
            with self.subTest(interface=interface):
                self.navigate("/invariant/" + interface)
                self.assertEqual(self.script("return document.querySelector('h1').textContent"),
                                 {"tap": "Tap", "surface": "Surface",
                                  "evidence-gate": "Evidence Gate",
                                  "modular-topology": "Modular Topology",
                                  "credit-game": "Credit Game",
                                  "study-environment": "Study Environment"}[interface])
                self.assertIn("revision 0", self.script(
                    "return document.getElementById('session-summary').textContent"))
                self.assertTrue(self.script(
                    "return !!document.getElementById('coordinate-adapter')"))
                if interface != "modular-topology":
                    self.wait("return document.querySelector('iframe')?.contentDocument?.readyState === 'complete'")
                    self.assertTrue(self.script(
                        "return !!document.querySelector('iframe').contentDocument.querySelector('canvas')"))
                    self.assertEqual(self.script(
                        "return performance.getEntriesByType('resource').filter(x=>x.responseStatus>=400).map(x=>x.name)"), [])
                self.command("POST", "/refresh", {})
                self.wait("return document.getElementById('workspace')?.children.length > 0")
                self.assertIn("revision 0", self.script(
                    "return document.getElementById('session-summary').textContent"))

    def test_source_flow_return_navigation_and_history(self):
        self.navigate("/invariant/surface")
        self.wait("return !!document.querySelector('iframe')?.contentDocument?.querySelector('canvas')")
        self.script("""
          const f=document.querySelector('iframe');
          f.scrollIntoView({block:'center'});
          f.contentDocument.querySelector('canvas').scrollIntoView({block:'center'});
        """)
        bounds = self.script("""
          const f=document.querySelector('iframe'), c=f.contentDocument.querySelector('canvas');
          const a=f.getBoundingClientRect(), b=c.getBoundingClientRect();
          const left=Math.max(0,a.left+b.left), right=Math.min(innerWidth,a.right,a.left+b.right);
          const top=Math.max(0,a.top,a.top+b.top), bottom=Math.min(innerHeight,a.bottom,a.top+b.bottom);
          return {x:Math.round((left+right)/2),y:Math.round((top+bottom)/2)};
        """)
        self.command("POST", "/actions", {"actions": [{"type": "pointer", "id": "mouse",
            "parameters": {"pointerType": "mouse"}, "actions": [
                {"type": "pointerMove", "duration": 0, **bounds},
                {"type": "pointerDown", "button": 0},
                {"type": "pointerMove", "duration": 100, "x": bounds["x"] + 15, "y": bounds["y"] + 10},
                {"type": "pointerUp", "button": 0}]}]})
        self.wait("return document.getElementById('record-select').options.length > 0")
        record = json.loads(self.script("return document.getElementById('record-output').textContent"))
        self.assertEqual(record["adapter"], "surface-derived/v1")
        self.assertEqual(set(record["output"]), {"activity", "severity", "occupancy", "unresolved"})
        self.assertIn(record["source"], {"touch", "movement"})
        self.script("window.priorSurfaceSnapshot = document.querySelector('iframe').contentWindow.SurfaceOutput.snapshot")
        self.assertEqual(self.script("return priorSurfaceSnapshot().rawContactHistory"), 0)
        self.script("document.querySelector('#bridges button').click()")
        self.wait("return document.querySelector('h1').textContent === 'Tap'")
        self.assertIn("derived", self.script("return document.getElementById('workspace').textContent"))
        self.wait("return priorSurfaceSnapshot().playing === false && priorSurfaceSnapshot().audioState === 'closed'")
        self.assertEqual(self.script("return priorSurfaceSnapshot().activeNodes"), 0)
        self.assertFalse(self.script("return priorSurfaceSnapshot().tiltEnabled"))
        self.wait("return document.querySelector('iframe')?.contentDocument?.getElementById('invariant-derived-status')?.textContent.includes('session revision')")
        self.script("document.querySelector('a[data-route=sphere]').click()")
        self.assertEqual(self.script("return document.querySelector('h1').textContent"),
                         "Sphere / shared state")
        self.command("POST", "/back", {})
        self.wait("return document.querySelector('h1').textContent === 'Tap'")
        self.command("POST", "/forward", {})
        self.wait("return document.querySelector('h1').textContent === 'Sphere / shared state'")
        self.assertGreater(self.script("return document.getElementById('record-select').options.length"), 1)

    def test_evidence_recomputes_and_unavailable_authority_is_denied(self):
        self.navigate("/invariant/evidence-gate")
        self.script("""
          [...document.querySelectorAll('#workspace button')]
            .find(b=>b.textContent==='Check synthetic shear').click();
        """)
        self.wait("return document.getElementById('workspace').textContent.includes('sample-counterexample')")
        self.assertIn('"authorization": false', self.script(
            "return document.getElementById('workspace').textContent"))
        self.script("document.querySelector('a[data-route=\"modular-topology\"]').click()")
        self.script("""
          [...document.querySelectorAll('#workspace button')]
            .find(b=>b.textContent==='Check engine.input').click();
        """)
        self.wait("return document.getElementById('workspace').textContent.includes('Missing qualified')")

    def test_worker_boundary_and_explicit_reopen_after_deactivation(self):
        self.navigate("/invariant/tap")
        self.wait("return !!document.querySelector('iframe')?.contentDocument?.querySelector('canvas')")
        registrations = self.command("POST", "/execute/async", {"script": """
          const done=arguments[arguments.length-1];
          navigator.serviceWorker.getRegistrations().then(r=>done(r.map(x=>x.scope)));
        """, "args": []})
        self.assertEqual(registrations, [])
        # Real pagehide lifecycle event; sensors/audio still require separate hardware checks.
        self.script("window.dispatchEvent(new PageTransitionEvent('pagehide'))")
        self.assertEqual(self.script("return document.querySelectorAll('iframe').length"), 0)
        self.script("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
        self.assertEqual(self.script("return document.querySelectorAll('iframe').length"), 0)
        self.assertIn("Reopen instrument", self.script(
            "return document.getElementById('workspace').textContent"))

    def test_source_return_link_uses_validated_shell_navigation(self):
        self.navigate("/invariant/surface")
        self.wait("return !!document.querySelector('iframe')?.contentDocument?.getElementById('invariant-return')")
        self.script("document.querySelector('iframe').contentDocument.getElementById('invariant-return').click()")
        self.wait("return document.querySelector('h1').textContent === 'Sphere / shared state'")
        self.assertEqual(self.script("return location.pathname"), "/invariant")
        self.assertEqual(self.script("return document.querySelectorAll('iframe').length"), 0)

    def test_origin_source_schema_checks_and_knowledge_without_credit(self):
        self.navigate("/invariant/surface")
        self.wait("return !!document.querySelector('iframe')?.contentDocument?.querySelector('canvas')")
        self.script("""
          window.postMessage({type:'invariant:instrument-output',record:{schema:'authority/v1'}}, location.origin);
        """)
        self.assertEqual(self.script("return document.getElementById('record-select').options.length"), 0)
        self.script("""
          document.querySelector('iframe').contentWindow.eval(
            "parent.postMessage({type:'invariant:instrument-output',record:{schema:'authority/v1'}},location.origin)");
        """)
        self.wait("return document.getElementById('status').textContent.includes('rejected')")
        self.assertEqual(self.script("return document.getElementById('record-select').options.length"), 0)
        self.script("document.querySelector('a[data-route=\"study-environment\"]').click()")
        self.wait("return !!document.querySelector('iframe')?.contentDocument?.getElementById('note')")
        self.script("""
          const d=document.querySelector('iframe').contentDocument;
          d.getElementById('note').value='A knowledge question without a credit prerequisite';
          d.getElementById('note').dispatchEvent(new Event('input'));
          d.getElementById('add-observation').click();
        """)
        self.assertIn("Research question", self.script(
            "return document.querySelector('iframe').contentDocument.getElementById('journal-list').textContent"))

    def test_committed_admission_reconciles_after_navigation(self):
        self.navigate("/invariant/surface")
        self.wait("return !!document.querySelector('iframe')?.contentDocument?.getElementById('sample')")
        self.script("document.querySelector('iframe').contentDocument.getElementById('sample').click()")
        self.wait("return document.getElementById('record-select').options.length === 1")
        self.script("document.querySelector('#bridges button').click()")
        self.wait("return document.querySelector('h1').textContent === 'Tap'")
        self.script("document.querySelector('a[data-route=surface]').click()")
        self.wait("return !!document.querySelector('iframe')?.contentDocument?.getElementById('sample')")
        # Delay resolution, not computation, of the real browser's SHA-256 operation.
        self.script("""
          const digest=crypto.subtle.digest.bind(crypto.subtle);
          crypto.subtle.digest=(...args)=>digest(...args).then(value=>new Promise(resolve=>{
            window.releaseDigest=()=>resolve(value);
          }));
          document.querySelector('iframe').contentDocument.getElementById('sample').click();
        """)
        self.wait("return typeof releaseDigest === 'function'")
        self.script("document.querySelector('a[data-route=tap]').click(); releaseDigest()")
        self.wait("return document.getElementById('record-select').options.length === 3")
        self.assertFalse(self.script("return !!document.getElementById('derived-context')"))
        self.wait("return document.querySelector('iframe')?.contentDocument?.getElementById('invariant-derived-status')?.textContent.includes('superseded')")
