import { createRequire } from "module";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader"],
  defaultViewport: { width: 844, height: 390, isMobile: true, hasTouch: true },
});

const page = await browser.newPage();
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
await page.type("input", "확인");
await page.click("button:not([disabled])");
await page.waitForSelector(".bike-card");
await page.click(".btn:not(.ghost)");
await page.waitForSelector(".ctrl.wide");
await page.$eval(".ctrl.wide", (el) => {
  el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
});
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: "scripts/ride-start.png" });
await new Promise((r) => setTimeout(r, 7000));
await page.screenshot({ path: "scripts/ride-mid.png" });
const hud = await page.evaluate(() => document.body.innerText);
console.log(hud.slice(0, 250));
await browser.close();
