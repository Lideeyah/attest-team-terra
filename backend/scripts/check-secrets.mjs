for (const name of Object.keys(process.env)) {
  if (/^NEXT_PUBLIC_.*(KEY|SECRET|TOKEN)/i.test(name)) throw Error(`Forbidden public secret variable: ${name}`);
}
