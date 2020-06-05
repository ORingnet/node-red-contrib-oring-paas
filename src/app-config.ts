import {
  Red,
  NodeProperties,
} from 'node-red';

interface AppConfigProperties extends NodeProperties {
  appId: string;
  appSecret: string;
  apiKey: string;
}

export = function (RED: Red): void {
  function AppConfig(config: AppConfigProperties): void {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.apiKey = config.apiKey;
  }

  RED.nodes.registerType('oring-paas-app-config', AppConfig);
}
