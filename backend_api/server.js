import 'dotenv/config';
import { assertRequiredEnvironment } from './src/config/environment.js';

assertRequiredEnvironment();
const { default: app } = await import('./app.js');
const port = Number(process.env.PORT || 3000);

app.listen(port, '0.0.0.0', () => {
  console.log(`ZenBarber API escutando na porta ${port}`);
});
