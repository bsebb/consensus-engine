# Prisma Database Schema

This defines the PostgreSQL architecture. We enforce strict referential integrity via Prisma to prevent ghost data and double-voting.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum RoomStatus {
  CONFIGURING
  SUGGESTING
  VOTING
  RESOLVED
}

enum OptionSource {
  GOOGLE_API
  USER_CUSTOM
}

model Room {
  id            String       @id @default(uuid())
  pin           String       @unique
  host_id       String
  status        RoomStatus   @default(CONFIGURING)
  created_at    DateTime     @default(now())
  
  // Relationships
  participants  Participant[]
  options       Option[]
}

model Participant {
  id            String    @id @default(uuid())
  room_id       String
  budget_cap    Int?      // Step Zero constraint
  
  // Relationships
  room          Room      @relation(fields: [room_id], references: [id], onDelete: Cascade)
  votes         Vote[]
  feedbacks     Feedback[]
}

model Option {
  id              String       @id @default(uuid())
  room_id         String
  name            String
  source          OptionSource
  google_place_id String?      // Null if USER_CUSTOM
  price_level     Int?
  
  // Relationships
  room            Room         @relation(fields: [room_id], references: [id], onDelete: Cascade)
  votes           Vote[]
  feedbacks       Feedback[]
}

model Vote {
  id             String      @id @default(uuid())
  participant_id String
  option_id      String
  score          Int         // e.g., 1 (Like), -1 (Veto), 0 (Neutral)

  // Relationships
  participant    Participant @relation(fields: [participant_id], references: [id], onDelete: Cascade)
  option         Option      @relation(fields: [option_id], references: [id], onDelete: Cascade)

  // Critical: Composite Unique Constraint prevents double-voting race conditions
  @@unique([participant_id, option_id])
}

model VenueAnalytics {
  id                   String   @id @default(uuid())
  google_place_id      String   @unique
  name                 String
  true_price_avg       Float    @default(0.0)
  consensus_win_rate   Float    @default(0.0)
  satisfaction_avg     Float    @default(0.0)
  total_reviews        Int      @default(0)
}

model Feedback {
  id                   String      @id @default(uuid())
  participant_id       String
  option_id            String
  satisfaction_score   Int
  price_accuracy_score Int
  
  // Relationships
  participant          Participant @relation(fields: [participant_id], references: [id])
  option               Option      @relation(fields: [option_id], references: [id])
}
```
