import { createRequire } from "module";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader"],
  defaultViewport: { width: 844, height: 390, isMobile: true, hasTouch: true },
});

async function rideWithBike(index) {
  const page = await browser.newPage();
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
  await page.type("input", "테스터");
  await page.click("button:not([disabled])");
  await page.waitForSelector(".bike-card");
  const cards = await page.$$(".bike-card");
  await cards[index].click();
  await page.click(".btn:not(.ghost)");
  await page.waitForSelector(".ctrl.wide");
  await page.$eval(".ctrl.wide", (el) => {
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
  });
  await new Promise((r) => setTimeout(r, 2200));
  const speed = await page.$eval(".speed", (el) => el.textContent);
  const name = await page.$eval(".hud-top", (el) => el.innerText);
  await page.close();
  return { speed, name };
}

const host = await browser.newPage();
await host.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
await host.type("input", "호스트");
await host.click("button.ghost");
await host.waitForSelector(".bike-card");
await host.click(".btn:not(.ghost)");
await host.waitForSelector(".lobby-code, .btn");
await host.click("button.btn");
await host.waitForSelector(".lobby-code");
const code = await host.$eval(".lobby-code", (el) => el.textContent);

const guest = await browser.newPage();
await guest.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
await guest.type("input", "게스트");
await guest.click("button.ghost");
await guest.waitForSelector(".bike-card");
const cards = await guest.$$(".bike-card");
await cards[1].click();
await guest.click(".btn:not(.ghost)");
await guest.type("input", code);
await guest.click("button.ghost");
await new Promise((r) => setTimeout(r, 700));
const hostRiders = await host.$$eval(".rider-row", (els) => els.map((el) => el.innerText));
const guestRiders = await guest.$$eval(".rider-row", (els) => els.map((el) => el.innerText));

const scr = await rideWithBike(0);
const aero = await rideWithBike(1);

console.log(JSON.stringify({ code, hostRiders, guestRiders, scr, aero }, null, 2));
await browser.close();
