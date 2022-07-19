import { app, port } from 'src/mocked-server/mocked-server';
app.listen(port, () => {
  console.log(`SQLUI Native Mocked Server started and listening on port ${port}`);
});
