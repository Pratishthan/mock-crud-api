#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const chalk = require("chalk");
const process = require("process");
const { parseArgs } = require("util");

const {
  deepCompare,
  loadConfig,
  clearUrl,
  parseQueryString,
  validateData,
  httpErrorResponse,
  httpResponse,
  validateAndCheckMethod,
} = require("./utils");

class CreateServer {
  constructor(serverConfigs = []) {
    if (!Array.isArray(serverConfigs)) {
      throw new Error("Server configs must be an array");
    }
    this.serverConfigs = serverConfigs.map((config) => {
      try {
        config.method = validateAndCheckMethod(config.method);
        if (config.output.filePath) {
          if (!fs.existsSync(config.output.filePath)) {
            throw new Error(`File not found at path: ${config.output.filePath}`);
          }
          config.output.response = fs.readFileSync(config.output.filePath, "utf-8");
        }
        if (config.input.filePath) {
          if (!fs.existsSync(config.input.filePath)) {
            throw new Error(`File not found at path: ${config.input.filePath}`);
          }
          config.input.request = fs.readFileSync(config.input.filePath, "utf-8");
        }
        validateData(config);
        return config;
      } catch (err) {
        console.error(chalk.red(`${err.message} for server ${config.name}`));
        process.exit(1);
      }
    });

    this.port = serverConfigs[0].port;
    this.server = this.createServer();
    this.logServerInfo();
  }

  createServer() {
    const server = http.createServer((req, res) => {
      let body = "";

      req.on("data", chunk => body += chunk.toString());
      req.on("end", () => {
        try {
          req.body = body ? JSON.parse(body) : {};
        } catch (err) {
          req.body = {};
        }

        if (req.url.includes("?")) {
          req.query = req.url.split("?")[1];
        }

        this.handleRequest(req, res);
      });
    });

    server.listen(this.port);
    return server;
  }

  handleRequest(req, res) {
    const reqUrl = clearUrl(req.url);
    let reqObj = req.body || {};

    if (req.query) {
      reqObj = { ...reqObj, ...parseQueryString(req.query) };
    }

    for (const config of this.serverConfigs) {
      if (config.method.includes(req.method) && config.path === reqUrl) {
        console.log(chalk.green("Matched Config:"), config.name);

        if (!config.input.request || deepCompare(reqObj, config.input.request)) {
          console.log(chalk.green("Input Matched"));
          httpResponse(res, config);
          return;
        } else {
          console.log(chalk.red("Input Not Matched"));
          httpErrorResponse(res);
          return;
        }
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("No matching configuration found");
  }

  logServerInfo() {
    const table = this.serverConfigs.map(config => ({
      "Server Name": config.name,
      port: config.port,
      path: config.path,
      method: config.method,
      input: JSON.stringify(config.input),
      output: config.output.fileData ? "(file)" : JSON.stringify(config.output.response),
      description: config.description,
      filePath: config.output.filePath || "no",
      "Server URL": `http://localhost:${config.port}${config.path}`,
      Status: "Running"
    }));

    console.table(table);
  }

  close() {
    console.log(chalk.red("Server Closed on port:"), this.port);
    this.server.close();
  }
}

const startMultipleServer = (config) => {
  console.log(chalk.bgYellow("Starting Multiple Servers"));
  if (!Array.isArray(config)) config = [config];

  const portMap = {};
  for (const entry of config) {
    if (!portMap[entry.port]) portMap[entry.port] = [];
    portMap[entry.port].push(entry);
  }

  return Object.entries(portMap).map(([port, configs]) => new CreateServer(configs));
};

const help = () => {
  console.log(chalk.bgYellow("Help Menu"));
  console.log(chalk.green("-c, --config : Path to config file"));
  console.log(chalk.green("-h, --help   : Show help"));

  console.table({
    name: "Name of server",
    method: "HTTP Method (GET, POST, etc.)",
    port: "Port to listen on",
    path: "Endpoint path",
    input: "Expected input for matching",
    output: "Output on match",
    filePath: "File path for JSON response",
    description: "Server description"
  });
};

const main = () => {
  const options = {
    config: { short: "c", type: "string" },
    help: { short: "h", type: "boolean" },
  };

  const { values } = parseArgs({ args: process.argv, options, allowPositionals: true });

  if (values.help) {
    help();
    process.exit(0);
  } else if (values.config) {
    console.log("Using Config File:", values.config);
    const config = loadConfig(values.config);
    startMultipleServer(config);
  } else {
    console.log(chalk.red("No config file passed\n"));
    help();
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  CreateServer,
  startMultipleServer,
  help
};
