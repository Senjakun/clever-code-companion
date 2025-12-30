// Code Validation Utilities

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationWarning {
  message: string;
  suggestion?: string;
}

// Basic syntax validation for common issues
export function validateCode(code: string, language: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (language === "typescript" || language === "tsx" || language === "javascript" || language === "jsx") {
    validateJavaScriptSyntax(code, errors, warnings);
  }

  if (language === "css") {
    validateCSSSyntax(code, errors, warnings);
  }

  if (language === "html") {
    validateHTMLSyntax(code, errors, warnings);
  }

  return {
    isValid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
    warnings,
  };
}

function validateJavaScriptSyntax(code: string, errors: ValidationError[], warnings: ValidationWarning[]) {
  const lines = code.split("\n");

  // Track bracket balance
  let braceCount = 0;
  let bracketCount = 0;
  let parenCount = 0;
  let templateLiteralDepth = 0;
  let inString: string | null = null;
  let inMultiLineComment = false;

  lines.forEach((line, lineIndex) => {
    let i = 0;
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) return;

    // Check for common issues
    if (trimmedLine.endsWith(";;")) {
      warnings.push({ message: `Line ${lineIndex + 1}: Double semicolon detected`, suggestion: "Remove extra semicolon" });
    }

    // Check for console.log in production code
    if (trimmedLine.includes("console.log")) {
      warnings.push({ message: `Line ${lineIndex + 1}: console.log found`, suggestion: "Consider removing for production" });
    }

    // Check for TODO comments
    if (trimmedLine.includes("TODO") || trimmedLine.includes("FIXME")) {
      warnings.push({ message: `Line ${lineIndex + 1}: TODO/FIXME comment found` });
    }

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      // Handle multi-line comments
      if (inMultiLineComment) {
        if (char === "*" && nextChar === "/") {
          inMultiLineComment = false;
          i++;
        }
        i++;
        continue;
      }

      // Handle single-line comments
      if (char === "/" && nextChar === "/") {
        break;
      }

      // Handle multi-line comment start
      if (char === "/" && nextChar === "*") {
        inMultiLineComment = true;
        i += 2;
        continue;
      }

      // Handle strings
      if (!inString && (char === '"' || char === "'" || char === "`")) {
        inString = char;
        if (char === "`") templateLiteralDepth++;
        i++;
        continue;
      }

      if (inString) {
        if (char === "\\" && nextChar) {
          i += 2;
          continue;
        }
        if (char === inString) {
          if (char === "`") templateLiteralDepth--;
          inString = templateLiteralDepth > 0 ? "`" : null;
        }
        i++;
        continue;
      }

      // Count brackets
      switch (char) {
        case "{":
          braceCount++;
          break;
        case "}":
          braceCount--;
          break;
        case "[":
          bracketCount++;
          break;
        case "]":
          bracketCount--;
          break;
        case "(":
          parenCount++;
          break;
        case ")":
          parenCount--;
          break;
      }

      // Check for negative balance (closing before opening)
      if (braceCount < 0) {
        errors.push({ line: lineIndex + 1, column: i + 1, message: "Unexpected closing brace '}'", severity: "error" });
        braceCount = 0;
      }
      if (bracketCount < 0) {
        errors.push({ line: lineIndex + 1, column: i + 1, message: "Unexpected closing bracket ']'", severity: "error" });
        bracketCount = 0;
      }
      if (parenCount < 0) {
        errors.push({ line: lineIndex + 1, column: i + 1, message: "Unexpected closing parenthesis ')'", severity: "error" });
        parenCount = 0;
      }

      i++;
    }
  });

  // Check for unclosed brackets at end
  if (braceCount > 0) {
    errors.push({ line: lines.length, column: 0, message: `${braceCount} unclosed brace(s) '{'`, severity: "error" });
  }
  if (bracketCount > 0) {
    errors.push({ line: lines.length, column: 0, message: `${bracketCount} unclosed bracket(s) '['`, severity: "error" });
  }
  if (parenCount > 0) {
    errors.push({ line: lines.length, column: 0, message: `${parenCount} unclosed parenthesis '('`, severity: "error" });
  }

  // Check for common React issues
  if (code.includes("useState") && !code.includes("import") && !code.includes("React.useState")) {
    warnings.push({ message: "useState used but React import not detected", suggestion: "Add: import { useState } from 'react'" });
  }

  if (code.includes("useEffect") && !code.includes("import") && !code.includes("React.useEffect")) {
    warnings.push({ message: "useEffect used but React import not detected", suggestion: "Add: import { useEffect } from 'react'" });
  }
}

function validateCSSSyntax(code: string, errors: ValidationError[], warnings: ValidationWarning[]) {
  const lines = code.split("\n");
  let braceCount = 0;

  lines.forEach((line, lineIndex) => {
    for (const char of line) {
      if (char === "{") braceCount++;
      if (char === "}") braceCount--;
    }
  });

  if (braceCount > 0) {
    errors.push({ line: lines.length, column: 0, message: `${braceCount} unclosed CSS block(s)`, severity: "error" });
  }
  if (braceCount < 0) {
    errors.push({ line: lines.length, column: 0, message: `${Math.abs(braceCount)} extra closing brace(s)`, severity: "error" });
  }
}

function validateHTMLSyntax(code: string, errors: ValidationError[], warnings: ValidationWarning[]) {
  // Basic tag matching
  const tagStack: string[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  const selfClosingTags = ["br", "hr", "img", "input", "meta", "link", "area", "base", "col", "embed", "param", "source", "track", "wbr"];

  let match;
  while ((match = tagRegex.exec(code)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1].toLowerCase();

    if (selfClosingTags.includes(tagName)) continue;

    if (fullMatch.startsWith("</")) {
      if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tagName) {
        errors.push({ line: 1, column: match.index, message: `Unexpected closing tag </${tagName}>`, severity: "error" });
      } else {
        tagStack.pop();
      }
    } else if (!fullMatch.endsWith("/>")) {
      tagStack.push(tagName);
    }
  }

  tagStack.forEach((tag) => {
    errors.push({ line: 1, column: 0, message: `Unclosed tag <${tag}>`, severity: "error" });
  });
}

// Validate file changes before applying
export function validateFileChanges(changes: { filePath: string; content: string }[]): ValidationResult[] {
  return changes.map((change) => {
    const ext = change.filePath.split(".").pop()?.toLowerCase() || "";
    const languageMap: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      css: "css",
      html: "html",
      json: "json",
    };
    const language = languageMap[ext] || "text";
    return validateCode(change.content, language);
  });
}
