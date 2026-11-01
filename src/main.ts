import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { loadEnvironment } from './environments/environment';

loadEnvironment()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
