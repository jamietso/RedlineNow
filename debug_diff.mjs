
import * as Diff from 'diff';

const original = `5.2 Client IP. Client owns all right, title, and interest in and to the Deliverables upon full payment of all fees due under the applicable SOW.

6. CONFIDENTIALITY`;

const modified = `5.2 Client IP. Client owns all right, title, and interest in and to the Deliverables upon creation, subject to full payment of all fees due under the applicable SOW. Provider hereby assigns all right, title and interest in the Deliverables to Client.

6. CONFIDENTIALITY`;

const parts = Diff.diffWords(original, modified);

console.log("Diff Parts:");
parts.forEach((part, i) => {
  console.log(`Part ${i}: "${part.value.replace(/\n/g, '\\n')}" (added: ${part.added}, removed: ${part.removed})`);
});

// Simulate segmentation
const segmentDiffIntoSentences = (diffParts) => {
  const sentences = [];
  let currentParts = [];
  let currentId = 0;
  const sentenceEndRegex = /([.!?]+)(?=\s|$)/g;

  for (const part of diffParts) {
    let remainingValue = part.value;
    let match;

    while ((match = sentenceEndRegex.exec(remainingValue)) !== null) {
      const endIdx = match.index + match[0].length;
      const segment = remainingValue.substring(0, endIdx);
      
      if (segment) {
        currentParts.push({ ...part, value: segment });
      }

      if (currentParts.length > 0) {
        const hasEdits = currentParts.some(p => p.added || p.removed);
        console.log(`Sentence ${currentId}: "${currentParts.map(p => p.value.replace(/\n/g, '\\n')).join('')}" (hasEdits: ${hasEdits})`);
        sentences.push({
            id: `sentence-${currentId++}`,
            parts: currentParts,
            hasEdits,
            rawText: ''
        });
        currentParts = [];
      }

      remainingValue = remainingValue.substring(endIdx);
      sentenceEndRegex.lastIndex = 0;
    }

    if (remainingValue) {
      currentParts.push({ ...part, value: remainingValue });
    }
  }

  if (currentParts.length > 0) {
     const hasEdits = currentParts.some(p => p.added || p.removed);
     console.log(`Sentence ${currentId}: "${currentParts.map(p => p.value.replace(/\n/g, '\\n')).join('')}" (hasEdits: ${hasEdits})`);
     sentences.push({
        id: `sentence-${currentId++}`,
        parts: currentParts,
        hasEdits,
        rawText: ''
    });
  }

  return sentences;
};

console.log("\nSentences:");
segmentDiffIntoSentences(parts);
