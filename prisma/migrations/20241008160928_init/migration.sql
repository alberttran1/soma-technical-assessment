-- CreateTable
CREATE TABLE "Todo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME NULL,
    "imgURL" TEXT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dependedById" INTEGER NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    FOREIGN KEY ("dependedById") REFERENCES "Todo"("id") ON DELETE SET NULL,
    UNIQUE ("dependedById", "order") -- Enforce unique order per parent
);
