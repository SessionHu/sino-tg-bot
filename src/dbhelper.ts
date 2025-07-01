import fs from 'node:fs/promises';
import path from 'node:path';

import * as logger from './logger';

/**
 * @description A helper class for file operations, specifically appending lines to a file.
 */
export class DBHelper {

  /**
   * @description The file handle for the opened file.
   */
  #fileHandle: fs.FileHandle | null = null;

  /**
   * @description The absolute path to the file being operated on.
   */
  #filePath: string;

  /**
   * Creates an instance of DBHelper.
   * Opens the file in append mode.
   * @param fname - The name of the file to open.
   */
  constructor(fname: string) {
    this.#filePath = path.resolve(fname); // Resolve to an absolute path for consistency
    this.#initializeFile(); // Call the async initialization method
  }

  /**
   * @description Initializes the file handle asynchronously.
   * This method is called in the constructor to open the file.
   */
  async #initializeFile(): Promise<void> {
    if (this.#fileHandle) return;
    try {
      // 'a' flag opens the file for appending. The file is created if it does not exist.
      this.#fileHandle = await fs.open(this.#filePath, 'a');
      logger.debug(`File '${this.#filePath}' opened successfully for appending.`);
      return;
    } catch (error) {
      logger.error(`Error opening file '${this.#filePath}':`, error);
      // In a real application, you might want to rethrow or handle this error more robustly.
    }
  }

  /**
   * Writes a line to the file.
   * Automatically appends a newline character if not present.
   * Automatically flushes the buffer (handled by fs.appendFile or write/close combination).
   * @param line - The line to write to the file.
   * @returns A promise that resolves when the write operation is complete.
   */
  async write(line: string): Promise<void> {
    // Ensure the file handle is available before writing
    if (!this.#fileHandle)
      return logger.warn('File handle not ready!');
    const lineToWrite = line.endsWith('\n') ? line : line + '\n';
    try {
      // Use the fileHandle.write method for writing
      await this.#fileHandle?.write(lineToWrite);
      // console.log(`已向文件 '${this.filePath}' 写入一行.`); // Line written to file.
    } catch (error) {
      logger.error(`Error writing to file '${this.#filePath}':`, error);
    }
  }

  /**
   * Closes the file.
   * @returns A promise that resolves when the file is closed.
   */
  async close(): Promise<void> {
    if (this.#fileHandle) {
      try {
        await this.#fileHandle.close();
        this.#fileHandle = null; // Clear the handle after closing
        logger.debug(`File '${this.#filePath}' successfully closed`);
      } catch (error) {
        logger.error(`Error closing file '${this.#filePath}':`, error);
      }
    } else {
      logger.warn(`File '${this.#filePath}' not open or already closed`);
    }
  }
}

// Export the class for potential use in other modules
export default DBHelper;
