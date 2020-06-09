import {
  Red,
  NodeProperties,
} from 'node-red';
import { connect } from 'mqtt';
import axios, { AxiosResponse } from 'axios';

import { idValueArraySchema } from './thing-data-stream-schema';
import { thingCommandSchema } from './thing-command-schema';
import {
  MQTT_BROKER_URL,
  CONNECTED_STATUS,
  CONNECTING_STATUS,
  DISCONNECTED_STATUS,
  ERROR_STATUS,
} from './consts/mqtt';

interface ThingProperties extends NodeProperties {
  thingId: string;
  appConfig: string;
  validatePayload: boolean;
}

interface GetDataBucketsResponse {
  data: {
    id: string;
  }[];
}

interface Input {
  payload: {
    topic: string;
    commandId: string;
    value: string | number | boolean;
  }
}

export = function (RED: Red): void {
  function Thing(config: ThingProperties): void {
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

    this.getDataTopics = async (): Promise<string[]> => {
      const api = `https://api.paas.oringnet.cloud/v4/things/${config.thingId}/data-buckets`;
      const result: AxiosResponse<GetDataBucketsResponse> = await axios({
        method: 'GET',
        url: api,
        headers: {
          Authorization: `ApiKey ${this.appConfig.apiKey}`,
        },
      });

      return result
        .data
        .data
        .map((dataBucket) => `$thing/${config.thingId}/$data/${dataBucket.id}`);
    };

    this.subscribeDataTopic = async () => {
      try {
        const topics = await this.getDataTopics();
        this.mqttClient.subscribe(topics);
      } catch (err) {
        this.error(err, err.message);
        this.status(ERROR_STATUS);
      }
    };

    this.handleMqttMessage = async (topic: string, message: Buffer) => {
      try {
        const timestamp = Date.now();
        let values = JSON.parse(message.toString());
        if (!Array.isArray(values)) {
          values = [values];
        }

        if (config.validatePayload) {
          await idValueArraySchema.validate(values);
        }

        this.send({
          payload: {
            topic,
            data: {
              timestamp,
              values,
            },
            type: 'stream',
          },
        });
      } catch (err) {
        this.error(err, err.message);
      }
    };

    if (this.appConfig) {
      this.connectMqtt();
      this.mqttClient.on('connect', () => {
        this.subscribeDataTopic();
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

      this.mqttClient.on('message', this.handleMqttMessage);
    }

    this.on('input', async (
      message: Input,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      send: (payload: any) => void,
      done: (err?: Error) => void,
    ) => {
      try {
        await thingCommandSchema.validate(message);
        if (this.mqttClient.connected) {
          this.mqttClient.publish(
            `$thing/${config.thingId}/$cmd/$downlink/${message.payload.topic}`,
            JSON.stringify({
              id: message.payload.commandId,
              value: message.payload.value,
            }),
          );
        }

        if (done) {
          done();
        }
      } catch (err) {
        this.error(err, err.message);
      }
    });

    this.on('close', (done: () => undefined) => {
      if (this.mqttClient) {
        this.mqttClient.end();
      }

      done();
    });
  }

  RED.nodes.registerType('oring-paas-thing', Thing);
}
