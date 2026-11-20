import type { BookProject } from '../types/ast';

/** Content for the smart "book feature" blocks, derived from the project metadata. */

export interface TitlePageData {
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  description: string;
  isbn: string;
}

export function getTitlePageData(project: BookProject): TitlePageData {
  const m = project.metadata;
  return {
    title: m.title || project.title,
    subtitle: m.subtitle || '',
    author: m.author || '',
    publisher: m.publisher || '',
    description: m.description || '',
    isbn: m.isbn || '',
  };
}

export interface CopyrightData {
  copyrightLine: string;
  publisherLine: string;
  isbnLine: string;
  editionLine: string;
  classification: string;
  contact: string;
  rightsStatement: string;
  disclaimer: string;
  author: string;
}

export function getCopyrightData(project: BookProject): CopyrightData {
  const m = project.metadata;
  const holder = m.copyrightHolder || m.publisher || m.author || '';
  const year = m.copyrightYear || String(new Date(project.createdAt || Date.now()).getFullYear());
  return {
    copyrightLine: holder ? `© ${year} ${holder}` : `© ${year}`,
    publisherLine: m.publisher ? `Published by ${m.publisher}` : '',
    isbnLine: m.isbn ? `ISBN ${m.isbn}` : '',
    editionLine: m.edition || '',
    classification: m.classification || '',
    contact: m.contact || '',
    rightsStatement: m.rightsStatement || '',
    disclaimer: m.disclaimer || '',
    author: m.author || '',
  };
}

export const DEFAULT_RIGHTS_STATEMENT =
  'All rights reserved. No part of this book may be copied, reproduced or distributed in any form without the written permission of the publisher and the author.';
