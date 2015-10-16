export function prompt(question) {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdout.write(question);
    process.stdout.write('\n> ');

    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

export async function yesOrNo(question, yesIsDefault = true) {
  const suffix = yesIsDefault ? 'Y/n' : 'y/N';
  const answer = await prompt(`${question} (${suffix})`);
  return answer === 'Y' || answer === 'y' || (
    answer === '' && yesIsDefault
  );
}
