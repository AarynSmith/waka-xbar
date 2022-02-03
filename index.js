#!/usr/bin/env /usr/local/bin/node

// <xbar.title>WakaTime Tracker</xbar.title>
// <xbar.version>v1.0</xbar.version>
// <xbar.author>Aaryn Smith</xbar.author>
// <xbar.author.github>aarynsmith</xbar.author.github>
// <xbar.desc>Gets informatiopn about your Wakatime Statistics</xbar.desc>
// <xbar.dependencies>node</xbar.dependencies>

// Variables:
// <xbar.var>string(VAR_API_KEY=""): WAKATime API key. wakatime --config-read api_key</xbar.var>

import xbar, { separator } from "@sindresorhus/xbar";
import axios from "axios";
import strftime from "strftime";

const WAKA_API = Buffer.from(process.env.VAR_API_KEY || "").toString("base64");
if (!WAKA_API) {
  xbar([
    {
      text: "API Key not defined",
      href: "xbar://app.xbarapp.com/openPlugin?path=path/to/plugin",
    },
  ]);
  process.exit(0);
}

const client = axios.create({
  baseURL: "https://wakatime.com/api/v1/users/current/",
  headers: {
    Authorization: `Basic ${WAKA_API}`,
  },
});

const stDate = new Date();
stDate.setDate(stDate.getDate() - 6);
const stDateStr = strftime("%F", stDate);
const endDateStr = strftime("%F", new Date());

const XBARMsg = [
  {
    text: `:clock10: WakaTime`,
    dropdown: false,
  },
  separator,
  {
    text: `Last 7 days: No Data`,
    href: "https://wakatime.com/dashboard/",
  },
  {
    text: "Languages",
    dropdown: true,
    submenu: [
      {
        text: "No Data",
      },
    ],
  },
  {
    text: "Projects",
    dropdown: true,
    submenu: [
      {
        text: "No Data",
      },
    ],
  },
  separator,
  {
    text: "All Time: No Data",
    href: "https://wakatime.com/dashboard/",
  },
];

const keyReduce = (data, keyName) =>
  data
    .flatMap((v) =>
      v[keyName].map((v) => {
        return { name: v.name, time: v.total_seconds };
      })
    )
    .reduce((p, c) => {
      p[c.name] = (p[c.name] || 0) + c.time;
      return p;
    }, {});

const formatEntries = (data) =>
  Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .map((v) => [v[0], sToDuration(v[1])]);

const sToDuration = (s) => {
  if (s < 60) return `${Math.floor(s)} sec`;
  const h = Math.floor(s / 3600);
  s = s % 3600;
  const m = Math.floor(s / 60);
  return `${h} hrs ${m} mins`;
};

client
  .get(`summaries/?start=${stDateStr}&end=${endDateStr}`)
  .then((summary_data) => {
    const data = summary_data.data;
    const languages = formatEntries(keyReduce(data.data, "languages"));
    const projects = formatEntries(keyReduce(data.data, "projects"));

    XBARMsg[0].text = `:clock10: ${
      data.data[data.data.length - 1].grand_total.text
    }`;
    XBARMsg[2].text = `Last 7 Days: ${data.cummulative_total.text}`;
    XBARMsg[3].submenu = languages.map((v) => {
      return {
        text: `${v[0]}: ${v[1]}`,
        href: "https://wakatime.com/dashboard/",
      };
    });
    XBARMsg[4].submenu = projects.map((v) => {
      return {
        text: `${v[0]}: ${v[1]}`,
        href: `https://wakatime.com/projects/${v[0]}/`,
      };
    });

    client
      .get(`all_time_since_today`)
      .then((resp) => {
        XBARMsg[6].text = `All Time: ${resp.data.data.text}`;
        xbar(XBARMsg);
      })
      .catch(() => {
        xbar(XBARMsg);
      });
  })
  .catch((err) => {
    if (
      err.response &&
      err.response.data &&
      err.response.data.error == "Unauthorized"
    ) {
      xbar([
        {
          text: ":warning: Invaild API Key",
          href: "xbar://app.xbarapp.com/openPlugin?path=path/to/plugin",
        },
      ]);
      process.exit(0);
    }
    if (err.code === "ENOTFOUND") {
      xbar([
        {
          text: ":red_circle: Offline",
          href: "xbar://app.xbarapp.com/openPlugin?path=path/to/plugin",
        },
      ]);
      process.exit(0);
    }
    xbar([
      {
        text: `:warning: Error: ${err.code}`,
        href: "xbar://app.xbarapp.com/openPlugin?path=path/to/plugin",
      },
    ]);

    console.error(err);
  });
