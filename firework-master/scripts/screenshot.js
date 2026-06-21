import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9876;
const BASE = `http://localhost:${PORT}`;
const SCREENSHOTS = './screenshots';

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-m', 'http.server', String(PORT)], {
      cwd: process.cwd(),
      stdio: 'ignore',
    });
    proc.on('error', reject);
    // Give the server a moment to bind
    setTimeout(() => resolve(proc), 1200);
  });
}

async function captureStart(page) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#view-start', { state: 'visible' });
  await sleep(2500);
  await page.screenshot({ path: `${SCREENSHOTS}/start.png`, fullPage: false });
}

async function captureHub(page) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#new-game-btn');
  await page.click('#new-game-btn');
  await page.waitForSelector('#view-hub', { state: 'visible' });
  await sleep(800);
  await page.screenshot({ path: `${SCREENSHOTS}/hub.png`, fullPage: false });
}

async function captureEvents(page) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#new-game-btn');
  await page.click('#new-game-btn');
  await page.waitForSelector('#view-hub', { state: 'visible' });
  await page.click('#hub-events');
  await page.waitForSelector('#view-events', { state: 'visible' });
  await sleep(600);
  await page.screenshot({ path: `${SCREENSHOTS}/events.png`, fullPage: false });
}

async function captureBuild(page) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#new-game-btn');
  await page.click('#new-game-btn');
  await page.waitForSelector('#view-hub', { state: 'visible' });
  await page.click('#hub-events');
  await page.waitForSelector('#view-events', { state: 'visible' });
  await page.click('#event-list .event-select');
  await page.waitForSelector('#view-build', { state: 'visible' });
  await sleep(400);
  await page.screenshot({ path: `${SCREENSHOTS}/build.png`, fullPage: false });
}

async function capturePerformAndResult(page) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#new-game-btn');
  await page.click('#new-game-btn');
  await page.waitForSelector('#view-hub', { state: 'visible' });
  await page.click('#hub-events');
  await page.waitForSelector('#view-events', { state: 'visible' });
  await page.click('#event-list .event-select');
  await page.waitForSelector('#view-build', { state: 'visible' });

  // Add two starting recipes to the show.
  await page.click('#library-recipes .library-item:nth-child(1)');
  await sleep(200);
  await page.click('#assembly-add');
  await sleep(200);
  await page.click('#library-recipes .library-item:nth-child(1)');
  await sleep(200);
  await page.click('#assembly-add');
  await sleep(200);

  await page.click('#build-confirm');
  await page.waitForSelector('#view-perform', { state: 'visible' });
  await sleep(2200);
  await page.screenshot({ path: `${SCREENSHOTS}/perform.png`, fullPage: false });

  await page.click('#perform-skip');
  await page.waitForSelector('#view-result', { state: 'visible' });
  await sleep(400);
  await page.screenshot({ path: `${SCREENSHOTS}/result.png`, fullPage: false });
}

async function captureLab(page) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#new-game-btn');
  await page.click('#new-game-btn');
  await page.waitForSelector('#view-hub', { state: 'visible' });
  await page.click('#hub-lab');
  await page.waitForSelector('#view-lab', { state: 'visible' });
  await sleep(600);
  await page.screenshot({ path: `${SCREENSHOTS}/lab.png`, fullPage: false });
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    await captureStart(page);
    console.log('Saved screenshots/start.png');
    await captureHub(page);
    console.log('Saved screenshots/hub.png');
    await captureEvents(page);
    console.log('Saved screenshots/events.png');
    await captureBuild(page);
    console.log('Saved screenshots/build.png');
    await capturePerformAndResult(page);
    console.log('Saved screenshots/perform.png');
    console.log('Saved screenshots/result.png');
    await captureLab(page);
    console.log('Saved screenshots/lab.png');
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
