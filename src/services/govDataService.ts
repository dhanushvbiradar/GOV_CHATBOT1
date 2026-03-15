export async function getServices() {
  const response = await fetch("http://127.0.0.1:5000/services");
  return await response.json();
}

export async function getSchemes() {
  const response = await fetch("http://127.0.0.1:5000/schemes");
  return await response.json();
}

export async function getDocuments() {
  const response = await fetch("http://127.0.0.1:5000/documents");
  return await response.json();
}