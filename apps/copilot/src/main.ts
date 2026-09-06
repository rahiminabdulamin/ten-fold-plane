import { readConfig } from "./config";
import { createServer } from "./server";

const config = readConfig(process.env);
createServer(config).listen(config.port, () => {
  console.log(`Copilot runtime listening on ${config.port}`);
});
