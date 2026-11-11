/** Asks a question on the terminal and reads the answer without echoing it. */
export function askHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  // Echo is switched off before the question is shown, so even fast typing never appears.
  if (stdin.isTTY) stdin.setRawMode(true);
  stdout.write(question);
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) {
      // Piped input (scripts): read one line as-is.
      let buffer = '';
      stdin.setEncoding('utf8');
      const onData = (chunk: string) => {
        buffer += chunk;
        const end = buffer.indexOf('\n');
        if (end >= 0) { stdin.off('data', onData); stdin.pause(); resolve(buffer.slice(0, end).replace(/\r$/, '')); }
      };
      stdin.on('data', onData);
      stdin.on('end', () => resolve(buffer.trim()));
      return;
    }
    let value = '';
    stdin.resume();
    stdin.setEncoding('utf8');
    const finish = (error?: Error) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      error ? reject(error) : resolve(value);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u0003' || char === '\u0004') return finish(new Error('Cancelled.'));
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    stdin.on('data', onData);
  });
}
