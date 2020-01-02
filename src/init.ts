import fs from 'fs'

fs.mkdir('out/image', { recursive: true }, (err => {
  if (err) {
    throw err
  }
}))

fs.mkdir('out/pdf', { recursive: true }, (err => {
  if (err) {
    throw err
  }
}))
