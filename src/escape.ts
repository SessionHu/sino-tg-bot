const LESS_THAN_REGEX = /\</g;

export function escapeHtmlText(text: string): string {
  return text.replace(LESS_THAN_REGEX, '&lt;');
}

export function toHtmlPreArray(text: string): string[] {
  return text.match(/^\n*$/) ?
    ['(empty)']
  : 
    splitStringIntoChunks(escapeHtmlText(text)).map(c => `<pre>${c}</pre>`);
}

/**
 * Define the maximum character limit for each string chunk.
 */
const MAX_CHUNK_SIZE = 4000; // 4096

/**
 * Splits a long string into chunks, each not exceeding MAX_CHUNK_SIZE characters.
 * Prioritizes splitting at newline characters (\n), preserving the newline.
 * If no newline is found within the limit, it performs a hard split at MAX_CHUNK_SIZE.
 *
 * @param text - The input string to be chunked.
 * @returns An array of chunked strings.
 */
export function splitStringIntoChunks(text: string): string[] {
  const chunks = new Array<string>; // Array to store the resulting string chunks.
  let currentIndex = 0; // Current index in the input string.

  // Loop until all characters in the text have been processed.
  while (currentIndex < text.length) {
    // Get the remaining text from the current index to the end of the string.
    const remainingText = text.substring(currentIndex);

    // Case A: If the remaining text length is less than or equal to MAX_CHUNK_SIZE, add it as the last chunk.
    if (remainingText.length <= MAX_CHUNK_SIZE) {
      chunks.push(remainingText);
      currentIndex = text.length; // All text has been processed.
      break; // Exit the loop.
    }

    // Case B: The remaining text length exceeds MAX_CHUNK_SIZE, requiring further chunking.

    // Calculate the default end index for the current chunk, which is a hard split at MAX_CHUNK_SIZE.
    const defaultChunkEndIndex = currentIndex + MAX_CHUNK_SIZE;

    // Get the potential chunk content, starting from currentIndex and having a length of MAX_CHUNK_SIZE.
    const potentialChunkContent = text.substring(currentIndex, defaultChunkEndIndex);

    // Find the last newline character within this potential chunk.
    const lastNewlineInPotentialChunk = potentialChunkContent.lastIndexOf('\n');

    // If a newline character was found within the potential chunk:
    if (lastNewlineInPotentialChunk !== -1) {
      // Choose to split after the newline, ensuring the newline is included in the current chunk.
      const chunk = text.substring(currentIndex, currentIndex + lastNewlineInPotentialChunk + 1);
      chunks.push(chunk);
      currentIndex += (lastNewlineInPotentialChunk + 1); // Update index to skip the processed chunk and newline.
    } else {
      // If no newline was found within the potential chunk, perform a hard split.
      // In this case, `potentialChunkContent` is already MAX_CHUNK_SIZE long, so it can be used directly.
      chunks.push(potentialChunkContent);
      currentIndex += MAX_CHUNK_SIZE; // Update index to skip the MAX_CHUNK_SIZE length processed.
    }
  }

  return chunks;
}

