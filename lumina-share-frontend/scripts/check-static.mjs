#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const errors = [];
const warnings = [];

// Check for forbidden patterns
const forbiddenPatterns = [
  { pattern: /getServerSideProps/, name: "getServerSideProps" },
  { pattern: /getStaticProps.*revalidate/, name: "ISR with revalidate" },
  { pattern: /export const runtime = ['"]edge['"]/, name: "Edge runtime" },
  { pattern: /route\.ts/, name: "Route handlers (route.ts)" },
  { pattern: /route\.js/, name: "Route handlers (route.js)" },
  { pattern: /app\/api\//, name: "API routes (app/api)" },
  { pattern: /pages\/api\//, name: "API routes (pages/api)" },
  { pattern: /from ['"]next\/headers['"]/, name: "next/headers" },
  { pattern: /from ['"]next\/server['"]/, name: "next/server" },
  { pattern: /cookies\(\)/, name: "cookies()" },
  { pattern: /from ['"]server-only['"]/, name: "server-only" },
  { pattern: /dynamic = ['"]force-dynamic['"]/, name: "force-dynamic" },
];

// Check for dynamic routes without generateStaticParams
function checkDynamicRoutes(dir, basePath = "") {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      const relativePath = join(basePath, entry);
      // Check if directory name contains dynamic segment
      if (entry.includes("[") && entry.includes("]")) {
        const pagePath = join(fullPath, "page.tsx");
        const pagePathJs = join(fullPath, "page.ts");
        
        if (existsSync(pagePath) || existsSync(pagePathJs)) {
          const content = existsSync(pagePath)
            ? readFileSync(pagePath, "utf-8")
            : readFileSync(pagePathJs, "utf-8");
          
          if (!content.includes("generateStaticParams")) {
            errors.push(
              `Dynamic route "${relativePath}" must export generateStaticParams function`
            );
          }
        }
      }
      
      checkDynamicRoutes(fullPath, relativePath);
    }
  }
}

// Check files
function checkFile(filePath) {
  if (!existsSync(filePath)) return;
  
  const content = readFileSync(filePath, "utf-8");
  
  for (const { pattern, name } of forbiddenPatterns) {
    if (pattern.test(content)) {
      errors.push(`File "${filePath}" contains forbidden pattern: ${name}`);
    }
  }
}

// Check all TypeScript/JavaScript files
function checkDirectory(dir, basePath = "") {
  if (!existsSync(dir)) return;
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (entry !== "node_modules" && entry !== ".next" && entry !== "out") {
        checkDirectory(fullPath, join(basePath, entry));
      }
    } else if (entry.match(/\.(ts|tsx|js|jsx)$/)) {
      checkFile(fullPath);
    }
  }
}

// Main check
console.log("🔍 Checking for static export violations...\n");

// Check app directory
const appDir = join(process.cwd(), "app");
checkDirectory(appDir);
checkDynamicRoutes(appDir);

// Check pages directory if exists
const pagesDir = join(process.cwd(), "pages");
if (existsSync(pagesDir)) {
  checkDirectory(pagesDir);
}

// Check next.config
const nextConfigPath = join(process.cwd(), "next.config.ts");
const nextConfigPathJs = join(process.cwd(), "next.config.js");
if (existsSync(nextConfigPath)) {
  checkFile(nextConfigPath);
} else if (existsSync(nextConfigPathJs)) {
  checkFile(nextConfigPathJs);
}

// Report results
if (errors.length > 0) {
  console.error("❌ Static export violations found:\n");
  errors.forEach((error) => console.error(`  - ${error}`));
  console.error("\n");
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("⚠️  Warnings:\n");
  warnings.forEach((warning) => console.warn(`  - ${warning}`));
  console.warn("\n");
}

console.log("✅ No static export violations found!\n");
process.exit(0);

