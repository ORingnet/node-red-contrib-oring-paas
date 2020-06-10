import { NodeStatus } from 'node-red';

export const MQTT_BROKER_URL = 'mqtts://mqtt.paas.oringnet.cloud:8083';

export const CONNECTED_STATUS: NodeStatus = {
  fill: 'green',
  shape: 'dot',
  text: 'connected',
};

export const CONNECTING_STATUS: NodeStatus = {
  fill: 'yellow',
  shape: 'dot',
  text: 'connecting',
};

export const DISCONNECTED_STATUS: NodeStatus = {
  fill: 'red',
  shape: 'dot',
  text: 'disconnected',
};

export const ERROR_STATUS: NodeStatus = {
  fill: 'red',
  shape: 'dot',
  text: 'error',
};
