const superagent = require("superagent");
const forEach = require("lodash/forEach");
const shuffle = require("lodash/shuffle");
const debounce = require("lodash/debounce");
const min = require("date-fns/min");
const twilio = require("twilio");

require("superagent-proxy")(superagent);

const proxies = [
  "51.158.68.26:8811",
  "91.134.180.0:3128",
  "163.172.152.52:8811",
  "51.158.108.135:8811",
  "51.158.120.84:8811",
  "51.158.119.88:8811",
  "51.158.123.35:8811",
  "51.158.98.121:8811",
  "51.91.212.159:3128",
  "163.172.147.94:8811",
  "51.158.99.51:8811",
  "51.158.111.229:8811",
  "163.172.128.177:8811",
  "51.158.113.142:8811",
  "51.158.106.54:8811",
  "163.172.189.32:8811",
  "5.135.182.93:3128",
  "163.172.154.72:8811",
  "51.178.30.231:3129",
  "92.222.149.114:3128",
  "51.158.68.133:8811",
  "51.158.68.68:8811",
  "176.31.191.70:3128",
  "51.38.71.101:8080",
  "51.91.108.251:80",
  "163.172.136.226:8811",
  "163.172.190.160:8811",
  "185.204.208.78:8080",
  "51.158.111.242:8811",
  "51.15.76.119:3128",
  "51.178.31.17:3128",
  "163.172.148.62:8811",
  "151.80.65.175:3128",
  "51.38.95.14:8080",
  "94.23.196.68:3128"
];

const endpoint =
  "https://booking.wavy.pro/api/shops/8a925be9-458d-43fd-a247-14193715c24d/booking/v2/slot";

const params = {
  startDate: "2019-12-31T23:00:00.000Z",
  endDate: "2020-01-31T22:59:59.999Z",
  key: "W71AM4qG6beGA3AW1Tz6T8Kf2bxu2jka",
  itemsQuery: [
    {
      id: "5c81249a1580bd0000034616",
      priceValue: 35,
      staffIds: ["595c9bc09754810000b722f3"]
    }
  ]
};

const smsClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

let maxDate = new Date("2020-01-10");

async function sendAvailableDates(availableDates) {
  maxDate = min(availableDates);

  let body = `Nouvelle date disponible`;
  if (availableDates.length > 1) {
    body = `Nouvelles dates disponibles`;
  }

  body += " chez le coiffeur. https://booking.wavy.pro/appart16";

  await smsClient.messages
    .create({
      body,
      from: "+17024879179",
      to: "+33671868193"
    })
    .catch(console.log);
}

function getProxy() {
  return shuffle(proxies)[0];
}

const check = debounce(async (retry = 0) => {
  const now = new Date();
  const hours = now.getHours();

  if ((hours >= 22 && hours <= 23) || (hours >= 0 && hours <= 7)) {
    return;
  }

  const res = await superagent
    .post(endpoint)
    .send(params)
    .proxy(`http://${getProxy()}`)
    .catch(() => {
      if (retry < 2) {
        check(retry + 1);
        check.flush();
      }
    });

  if (!res || !res.body) {
    check();
    return;
  }

  const slots = res.body;
  const availableDates = [];

  forEach(slots, (places, key) => {
    const date = new Date(key);

    if (date < now || date >= maxDate) {
      return;
    }

    if (places.length === 0) {
      return;
    }

    availableDates.push(date);
  });

  if (availableDates.length) {
    await sendAvailableDates(availableDates);
  }

  check();
}, 2 * 60 * 1000);

(async function main() {
  check();
  check.flush();
})();
