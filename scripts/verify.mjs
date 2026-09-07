import { createRequire } from "module";
import { writeFileSync } from "fs";

const require = createRequire(import.meta.url);

async function main() {
  let puppeteer;
  try {
    puppeteer = require("puppeteer-core");
  } catch {
    const { execSync } = await import("child_process");
    execSync("npm install --no-save puppeteer-core", { stdio: "inherit" });
    puppeteer = require("puppeteer-core");
  }

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader"],
    defaultViewport: { width: 844, height: 390, isMobile: true, hasTouch: true },
  });

  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("PAGEERROR", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("CONSOLE", msg.text());
  });

  await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
  await page.waitForSelector("h1");
  const home = await page.$eval("h1", (el) => el.textContent);
  await page.screenshot({ path: "scripts/home.png" });

  await page.type("input", "다니엘");
  await page.click("button:not([disabled])");
  await page.waitForSelector(".bike-card");
  const bikes = await page.$$eval(".bike-card h3", (els) => els.map((el) => el.textContent));
  await page.screenshot({ path: "scripts/select.png" });

  const cards = await page.$$(".bike-card");
  await cards[2].click();
  await page.click(".btn:not(.ghost)");
  await page.waitForSelector("canvas");
  await page.waitForSelector(".ctrl");
  await page.$eval(".ctrl.wide", (el) => {
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
  });
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: "scripts/ride.png" });
  const speedText = await page.$eval(".speed", (el) => el.textContent);

  const hud = await page.evaluate(() => document.body.innerText);
  writeFileSync("scripts/ride-text.txt", hud);

  console.log(JSON.stringify({ home, bikes, hasCanvas: true, speedText, hudSnippet: hud.slice(0, 400) }, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
