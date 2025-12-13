import Rollbar from 'rollbar';

const rollbar = new Rollbar({
  accessToken: import.meta.env.NEXT_PUBLIC_ROLLBAR_MYAPP_UI_CLIENT_TOKEN_1765636822 || '',
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
  },
  enabled: !!import.meta.env.NEXT_PUBLIC_ROLLBAR_MYAPP_UI_CLIENT_TOKEN_1765636822,
});

export default rollbar;
