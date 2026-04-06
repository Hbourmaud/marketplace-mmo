import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [...appConfig.providers],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
