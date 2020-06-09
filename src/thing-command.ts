import {
  Red,
  NodeProperties,
} from 'node-red';
import { connect } from 'mqtt';

import {
  MQTT_BROKER_URL,
  CONNECTED_STATUS,
  CONNECTING_STATUS,
  DISCONNECTED_STATUS,
  ERROR_STATUS,
} from './consts/mqtt';

interface ThingCommandProperties extends NodeProperties {
  topic: string;
  commandId: string;
  thingId: string;
  appConfig: string;
}

interface Message {
  payload: string | number | boolean;
}

export = function (RED: Red): void {
  function ThingCommand(config: ThingCommandProperties): void {
    RED.nodes.createNode(this, config);
    this.appConfig = RED.nodes.getNode(config.appConfig);

    this.connectMqtt = () => {
      const clientId = `app:${this.appConfig.appId}:${Date.now()}`;
      this.mqttClient = connect(
        MQTT_BROKER_URL,
        {
          clientId,
          username: this.appConfig.appId as string,
          password: this.appConfig.appSecret as string,
        },
      );
    };

    if (this.appConfig) {
      this.connectMqtt();
      this.mqttClient.on('connect', () => {
        this.status(CONNECTED_STATUS);
      });

      this.mqttClient.on('reconnect', () => {
        this.status(CONNECTING_STATUS);
      });

      this.mqttClient.on('disconnect', () => {
        this.status(DISCONNECTED_STATUS);
      });

      this.mqttClient.on('offline', () => {
        this.status(DISCONNECTED_STATUS);
      });

      this.mqttClient.on('error', (err: Error) => {
        this.status(ERROR_STATUS);
        this.error(err, err.message);
      });
    }

    this.on('input', async (
      /* eslint-disable @typescript-eslint/no-explicit-any */
      message: Message,
      send: (payload: any) => void,
      done: (err?: Error) => void,
    ) => {
      if (this.mqttClient.connected) {
        this.mqttClient.publish(
          `$thing/${config.thingId}/$cmd/$downlink/${config.topic}`,
          JSON.stringify({
            id: config.commandId,
            value: message.payload,
          }),
        );
      }

      if (done) {
        done();
      }
    });

    this.on('close', (done: () => undefined) => {
      if (this.mqttClient) {
        this.mqttClient.end();
      }

      done();
    });
  }

  RED.nodes.registerType('oring-paas-thing-command', ThingCommand);
}
