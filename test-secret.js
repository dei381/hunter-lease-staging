async function testSecret() {
  const res = await fetch('http://localhost:3000/api/test-secret');
  console.log(await res.text());
}
testSecret();
