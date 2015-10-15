import generate from 'project-name-generator';

export default function createAppName() {
  return generate({
    number: true,
  }).dashed;
}
