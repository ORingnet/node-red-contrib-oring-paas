import {
  Red,
  NodeProperties,
} from 'node-red';

import { dataPointSchema } from './dashboard-adapter-schema';

type MessageType = 'stream';

interface DashboardGaugeAdapterProperties extends NodeProperties {
  dataId: string;
}

interface DataPoint {
  timestamp: number;
  values: {
    id: string;
    value: number;
  }[]
}

interface Message {
  payload: {
    data: DataPoint;
    type: MessageType,
  }
}

interface GaugeDataPoint {
  payload: string | number | boolean;
}

export = function (RED: Red): void {
  function DashboardGaugeAdapter(config: DashboardGaugeAdapterProperties): void {
    RED.nodes.createNode(this, config);
    const { dataId } = config;

    this.converterStreamData = (dataPoint: DataPoint): GaugeDataPoint => {
      const { values } = dataPoint;
      return values
        .filter((v) => v.id === dataId)
        .reduce((prev, next) => ({
          ...prev,
          payload: next.value,
        }), {} as GaugeDataPoint);
    };

    this.on('input', async (
      message: Message,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      send: (payload: any) => void,
      done: (err?: Error) => void,
    ) => {
      try {
        switch (message.payload.type) {
          case 'stream':
            {
              await dataPointSchema.validate(message.payload.data);
              const value = this.converterStreamData(message.payload.data);
              if (typeof value.payload !== 'undefined') {
                send(value);
              }
            }
            break;
          default:
            break;
        }

        if (done) {
          done();
        }
      } catch (err) {
        if (done) {
          done(err);
        } else {
          this.error(err, err.message);
        }
      }
    });
  }


  RED.nodes.registerType('oring-paas-dashboard-gauge-adapter', DashboardGaugeAdapter);
}
