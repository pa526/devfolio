-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "accessToken" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedSlug" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Repo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "githubRepoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "description" TEXT,
    "readmeRaw" TEXT,
    "language" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT,
    "lastUpdated" DATETIME,
    "aiSummary" TEXT,
    "aiTags" TEXT NOT NULL DEFAULT '[]',
    "aiHighlight" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "summaryUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Repo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_publishedSlug_key" ON "User"("publishedSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Repo_userId_githubRepoId_key" ON "Repo"("userId", "githubRepoId");
