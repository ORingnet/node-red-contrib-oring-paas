import {
  Red,
  NodeProperties,
  NodeStatus,
} from 'node-red';
import { connect } from 'mqtt';
import axios, { AxiosResponse } from 'axios';

import { idValueArraySchema } from './thing-data-schema';

interface ThingDataStreamProperties extends NodeProperties {
  thingId: string;
  appConfig: string;
  validatePayload: boolean;
}

interface GetDataBucketsResponse {
  data: {
    id: string;
  }[];
}

export = function (RED: Red): void {
  const mqttBrokerUrl = 'mqtt://mqtt.paas.oringnet.cloud';
  const CONNECTED_STATUS: NodeStatus = {
    fill: 'green',
    shape: 'dot',
    text: 'connected',
  };

  const CONNECTING_STATUS: NodeStatus = {
    fill: 'yellow',
    shape: 'dot',
    text: 'connecting',
  };

  const DISCONNECTED_STATUS: NodeStatus = {
    fill: 'red',
    shape: 'dot',
    text: 'disconnected',
  };

  const ERROR_STATUS: NodeStatus = {
    fill: 'red',
    shape: 'dot',
    text: 'error',
  };

  function ThingDataStream(config: ThingDataStreamProperties): void {
    RED.nodes.createNode(this, config);
    this.appConfig = RED.nodes.getNode(config.appConfig);

    this.connectMqtt = () => {
      const clientId = `app:${this.appConfig.appId}:${Date.now()}`;
      this.mqttClient = connect(
        mqttBrokerUrl,
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
        let payload = JSON.parse(message.toString());
        if (!Array.isArray(payload)) {
          payload = [payload];
        }

        if (config.validatePayload) {
          await idValueArraySchema.validate(payload);
        }

        this.send({
          payload: {
            topic,
            timestamp,
            payload,
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
        this.status(DISCONNECTED_STATUS);
        this.error(err, err.message);
      });

      this.mqttClient.on('message', this.handleMqttMessage);
    }

    this.on('close', (done: () => undefined) => {
      if (this.mqttClient) {
        this.mqttClient.end();
      }

      done();
    });
  }

  RED.nodes.registerType('oring-paas-thing-data-stream', ThingDataStream);
}
