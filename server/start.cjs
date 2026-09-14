// LiteSpeed loads the startup file with require(); load the ES module dynamically.
import('./index.js').catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
