import {
  Red,
  NodeProperties,
} from 'node-red';

import { dataPointSchema } from './dashboard-adapter-schema';

type MessageType = 'stream' | 'datalogger';

interface DashboardChartAdapterProperties extends NodeProperties {
  dataIds?: string;
  excludeDataIds?: string;
}

interface DataPoint {
  timestamp: number;
  values: {
    id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  }[]
}

interface Message {
  payload: {
    data: DataPoint | DataPoint[];
    type: MessageType,
  }
}

interface ChartDataPoint {
  timestamp: number;
  series: string;
  payload: number;
}

export = function (RED: Red): void {
  function DashboardChartAdapter(config: DashboardChartAdapterProperties): void {
    RED.nodes.createNode(this, config);

    const dataIds = (config.dataIds || '')
      .split(',')
      .filter((v) => v !== '');

    const excludeDataIds = (config.excludeDataIds || '')
      .split(',')
      .filter((v) => v !== '');

    this.converterStreamData = (dataPoint: DataPoint): ChartDataPoint[] => {
      const { values } = dataPoint;
      return values
        .filter((v) => typeof v.value === 'number')
        .map((v) => ({
          timestamp: dataPoint.timestamp,
          series: v.id,
          payload: v.value,
        }));
    };

    this.filterDataIdsIfNeeded = (chartDataPoints: ChartDataPoint[]) => {
      let result = chartDataPoints;
      if (dataIds.length) {
        result = result
          .filter(
            (dataPoint) => dataIds
              .some((d) => d === dataPoint.series),
          );
      }

      if (excludeDataIds.length) {
        result = result.filter(
          (dataPoint) => !excludeDataIds
            .some((d) => d === dataPoint.series),
        );
      }

      return result;
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
            await dataPointSchema.validate(message.payload.data);
            this.filterDataIdsIfNeeded(
              this.converterStreamData(message.payload.data),
            )
              .forEach(send);
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

  RED.nodes.registerType('oring-paas-dashboard-chart-adapter', DashboardChartAdapter);
}
