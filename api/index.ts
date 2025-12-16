import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";

const app = express();

/* ============================
   MIDDLEWARE
============================ */
app.use(cors());
app.use(express.json());

/* ============================
   MODELOS
============================ */
interface User {
    id: string;
    name: string;
    email: string;
    password: string;
}

interface Habit {
    id: string;
    title: string;
    description?: string;
    frequency: "daily" | "weekly" | "custom";
    days: number[];
    userId: string;
    active: boolean;
    progress: number;
    createdAt: string;
}

interface HabitLog {
    id: string;
    habitId: string;
    date: string;
    completed: boolean;
}

/* ============================
   DATA EN MEMORIA
⚠️ Serverless = se reinicia
============================ */
let users: User[] = [];
let habits: Habit[] = [];
let habitLogs: HabitLog[] = [];

/* ============================
   UTILS
============================ */
function calculateProgress(habitId: string): number {
    const logs = habitLogs.filter(l => l.habitId === habitId);
    if (logs.length === 0) return 0;
    const completed = logs.filter(l => l.completed).length;
    return Math.round((completed / logs.length) * 100);
}

/* ============================
   ROUTER /api
============================ */
const router = express.Router();

/* ---------- ROOT ---------- */
router.get("/", (_req, res) => {
    res.send("Main API");
});

/* ---------- USERS ---------- */
router.post("/users/register", (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ msg: "Missing data" });
    }

    if (users.some(u => u.email === email)) {
        return res.status(409).json({ msg: "User already exists" });
    }

    const user: User = { id: uuid(), name, email, password };
    users.push(user);

    res.status(201).json({ data: user });
});

router.post("/users/access", (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = users.find(
        u => u.email === email && u.password === password
    );

    if (!user) {
        return res.status(401).json({ msg: "Invalid credentials" });
    }

    res.json({
        msg: "Access granted",
        data: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
    });
});

/* ---------- HABITS ---------- */
router.post("/habits", (req: Request, res: Response) => {
    const { title, description, frequency, days, userId } = req.body;

    if (!title || !frequency || !Array.isArray(days) || !userId) {
        return res.status(400).json({ msg: "Invalid habit data" });
    }

    const habit: Habit = {
        id: uuid(),
        title,
        description,
        frequency,
        days,
        userId,
        active: true,
        progress: 0,
        createdAt: new Date().toISOString(),
    };

    habits.push(habit);
    res.status(201).json({ data: habit });
});

router.get("/users/:id/habits", (req: Request, res: Response) => {
    const data = habits.filter(
        h => h.userId === req.params.id && h.active
    );
    res.json({ data });
});

router.post("/habits/:id/complete", (req: Request, res: Response) => {
    const habit = habits.find(h => h.id === req.params.id);

    if (!habit || !habit.active) {
        return res.status(404).json({ msg: "Habit not found" });
    }

    const today = new Date().toISOString().split("T")[0] as string;

    if (
        habitLogs.some(
            l => l.habitId === habit.id && l.date === today
        )
    ) {
        return res.status(409).json({ msg: "Already completed today" });
    }

    habitLogs.push({
        id: uuid(),
        habitId: habit.id,
        date: today,
        completed: true,
    });

    habit.progress = calculateProgress(habit.id);
    res.json({ data: habit });
});

router.get("/habits/:id/logs", (req: Request, res: Response) => {
    const logs = habitLogs.filter(l => l.habitId === req.params.id);
    res.json({ data: logs });
});

router.put("/habits/:id", (req: Request, res: Response) => {
    const habit = habits.find(h => h.id === req.params.id);
    if (!habit) {
        return res.status(404).json({ msg: "Habit not found" });
    }

    Object.assign(habit, req.body);
    res.json({ data: habit });
});

router.delete("/habits/:id", (req: Request, res: Response) => {
    const habit = habits.find(h => h.id === req.params.id);
    if (!habit) {
        return res.status(404).json({ msg: "Habit not found" });
    }

    habit.active = false;
    res.status(204).send();
});

/* ============================
   MONTAJE /api
============================ */
app.use("/api", router);

/* ============================
   EXPORT PARA VERCEL
============================ */
export default app;
