import Rollbar from 'rollbar';

const rollbar = new Rollbar({
  accessToken: import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN || '',
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
  },
  enabled: !!import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN,
});

export default rollbar;
