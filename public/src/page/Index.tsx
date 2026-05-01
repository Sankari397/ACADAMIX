import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, GraduationCap, History, BookOpen, Check, X } from "lucide-react";

const IA_MAX = 60;
const IA_PASS = 24; // 40% of 60
const ASSIGN_MAX = 40;
const MAX_SUBJECTS = 9;

type FieldKey = "ia1" | "ia2" | "a1" | "a2";

const FIELD_LABEL: Record<FieldKey, string> = {
  ia1: "IA1",
  ia2: "IA2",
  a1: "Assignment 1",
  a2: "Assignment 2",
};
const FIELD_MAX: Record<FieldKey, number> = {
  ia1: IA_MAX,
  ia2: IA_MAX,
  a1: ASSIGN_MAX,
  a2: ASSIGN_MAX,
};

type Marks = { ia1: number | null; ia2: number | null; a1: number | null; a2: number | null };

type HistoryEntry = {
  id: string;
  subjectId: string;
  field: FieldKey;
  from: number | null;
  to: number | null;
  mentor: string;
  at: number;
};

type Student = {
  id: string;
  name: string;
  rollNo: string;
  // marks per subjectId
  marks: Record<string, Marks>;
  history: HistoryEntry[];
};

type Subject = { id: string; name: string };

const emptyMarks = (): Marks => ({ ia1: null, ia2: null, a1: null, a2: null });

const seedSubjects: Subject[] = [
  { id: crypto.randomUUID(), name: "Mathematics" },
  { id: crypto.randomUUID(), name: "Data Structures" },
  { id: crypto.randomUUID(), name: "Operating Systems" },
];

const makeSeedStudents = (subjects: Subject[]): Student[] => {
  const m = (ia1: number | null, ia2: number | null, a1: number | null, a2: number | null): Marks => ({
    ia1, ia2, a1, a2,
  });
  return [
    {
      id: crypto.randomUUID(),
      name: "Aarav Sharma",
      rollNo: "CS-001",
      marks: {
        [subjects[0].id]: m(48, 52, 36, 38),
        [subjects[1].id]: m(45, 50, 35, 36),
        [subjects[2].id]: m(40, 44, 30, 32),
      },
      history: [],
    },
    {
      id: crypto.randomUUID(),
      name: "Priya Nair",
      rollNo: "CS-002",
      marks: {
        [subjects[0].id]: m(22, 30, 28, 12),
        [subjects[1].id]: m(26, 28, 30, 20),
        [subjects[2].id]: m(20, 19, 25, 18),
      },
      history: [],
    },
    {
      id: crypto.randomUUID(),
      name: "Rohan Mehta",
      rollNo: "CS-003",
      marks: {
        [subjects[0].id]: m(35, 18, 30, null),
        [subjects[1].id]: m(40, 38, 32, 30),
        [subjects[2].id]: m(28, 26, 22, 20),
      },
      history: [],
    },
  ];
};

const computeStatus = (ia1: number | null, ia2: number | null) => {
  if (ia1 == null || ia2 == null) return { label: "Pending", tone: "muted" as const };
  const passed = ia1 >= IA_PASS && ia2 >= IA_PASS;
  return passed
    ? { label: "Pass", tone: "success" as const }
    : { label: "Fail", tone: "destructive" as const };
};

const clampTo = (val: string, max: number): number | null => {
  if (val === "") return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(max, Math.round(n)));
};

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const Index = () => {
  const [subjects, setSubjects] = useState<Subject[]>(seedSubjects);
  const [activeSubjectId, setActiveSubjectId] = useState<string>(seedSubjects[0].id);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [newSubject, setNewSubject] = useState("");

  const [students, setStudents] = useState<Student[]>(() => makeSeedStudents(seedSubjects));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", rollNo: "", ia1: "", ia2: "", a1: "", a2: "" });
  const [mentor, setMentor] = useState<string>("Mentor");
  const [historyFor, setHistoryFor] = useState<Student | null>(null);

  useEffect(() => {
    document.title = "Subject-wise Marks Tracker | Mentor Dashboard";
    const desc =
      "Track IA1, IA2 (/60) and assignments (/40) per subject (up to 9), with live totals, pass/fail and per-student edit history.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? subjects[0];

  const getMarks = (s: Student, subjectId: string): Marks => s.marks[subjectId] ?? emptyMarks();

  const stats = useMemo(() => {
    const sid = activeSubject?.id;
    if (!sid) return { total: 0, pass: 0, fail: 0, pending: 0 };
    const evaluated = students.filter((s) => {
      const m = getMarks(s, sid);
      return m.ia1 != null && m.ia2 != null;
    });
    const pass = evaluated.filter((s) => {
      const m = getMarks(s, sid);
      return (m.ia1 ?? 0) >= IA_PASS && (m.ia2 ?? 0) >= IA_PASS;
    }).length;
    return {
      total: students.length,
      pass,
      fail: evaluated.length - pass,
      pending: students.length - evaluated.length,
    };
  }, [students, activeSubject]);

  const resetDraft = () => setDraft({ name: "", rollNo: "", ia1: "", ia2: "", a1: "", a2: "" });

  const startEdit = (s: Student) => {
    const m = getMarks(s, activeSubject.id);
    setEditingId(s.id);
    setDraft({
      name: s.name,
      rollNo: s.rollNo,
      ia1: m.ia1?.toString() ?? "",
      ia2: m.ia2?.toString() ?? "",
      a1: m.a1?.toString() ?? "",
      a2: m.a2?.toString() ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetDraft();
  };

  const handleSave = () => {
    if (!draft.name.trim() || !draft.rollNo.trim()) {
      toast({ title: "Missing info", description: "Name and roll number are required.", variant: "destructive" });
      return;
    }
    const next: Marks = {
      ia1: clampTo(draft.ia1, IA_MAX),
      ia2: clampTo(draft.ia2, IA_MAX),
      a1: clampTo(draft.a1, ASSIGN_MAX),
      a2: clampTo(draft.a2, ASSIGN_MAX),
    };
    const sid = activeSubject.id;
    const mentorName = mentor.trim() || "Mentor";

    if (editingId) {
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== editingId) return s;
          const prevMarks = getMarks(s, sid);
          const changes: HistoryEntry[] = (Object.keys(next) as FieldKey[])
            .filter((f) => prevMarks[f] !== next[f])
            .map((f) => ({
              id: crypto.randomUUID(),
              subjectId: sid,
              field: f,
              from: prevMarks[f],
              to: next[f],
              mentor: mentorName,
              at: Date.now(),
            }));
          return {
            ...s,
            name: draft.name.trim(),
            rollNo: draft.rollNo.trim(),
            marks: { ...s.marks, [sid]: next },
            history: [...changes, ...s.history],
          };
        }),
      );
      toast({ title: "Saved", description: `${draft.name} updated.` });
    } else {
      const fresh: Student = {
        id: crypto.randomUUID(),
        name: draft.name.trim(),
        rollNo: draft.rollNo.trim(),
        marks: Object.fromEntries(subjects.map((sub) => [sub.id, sub.id === sid ? next : emptyMarks()])),
        history: [],
      };
      setStudents((prev) => [...prev, fresh]);
      toast({ title: "Added", description: `${draft.name} added.` });
    }
    cancelEdit();
  };

  const updateField = (id: string, field: FieldKey, value: string) => {
    const mark = clampTo(value, FIELD_MAX[field]);
    const sid = activeSubject.id;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const m = getMarks(s, sid);
        return { ...s, marks: { ...s.marks, [sid]: { ...m, [field]: mark } } };
      }),
    );
  };

  const commitField = (id: string, field: FieldKey, original: number | null, value: string) => {
    const mark = clampTo(value, FIELD_MAX[field]);
    if (mark === original) return;
    const sid = activeSubject.id;
    const mentorName = mentor.trim() || "Mentor";
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              history: [
                {
                  id: crypto.randomUUID(),
                  subjectId: sid,
                  field,
                  from: original,
                  to: mark,
                  mentor: mentorName,
                  at: Date.now(),
                },
                ...s.history,
              ],
            }
          : s,
      ),
    );
  };

  const removeStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) cancelEdit();
    toast({ title: "Removed", description: "Student deleted." });
  };

  // Subject management
  const addSubject = () => {
    const name = newSubject.trim();
    if (!name) return;
    if (subjects.length >= MAX_SUBJECTS) {
      toast({ title: "Limit reached", description: `Maximum ${MAX_SUBJECTS} subjects.`, variant: "destructive" });
      return;
    }
    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Duplicate", description: "Subject already exists.", variant: "destructive" });
      return;
    }
    const sub: Subject = { id: crypto.randomUUID(), name };
    setSubjects((prev) => [...prev, sub]);
    // initialize empty marks for all students
    setStudents((prev) => prev.map((s) => ({ ...s, marks: { ...s.marks, [sub.id]: emptyMarks() } })));
    setNewSubject("");
    if (subjects.length === 0) setActiveSubjectId(sub.id);
    toast({ title: "Subject added", description: name });
  };

  const startEditSubject = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setSubjectDraft(sub.name);
  };

  const saveSubjectName = () => {
    const name = subjectDraft.trim();
    if (!name || !editingSubjectId) {
      setEditingSubjectId(null);
      return;
    }
    if (subjects.some((s) => s.id !== editingSubjectId && s.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Duplicate", description: "Another subject has this name.", variant: "destructive" });
      return;
    }
    setSubjects((prev) => prev.map((s) => (s.id === editingSubjectId ? { ...s, name } : s)));
    setEditingSubjectId(null);
    setSubjectDraft("");
    toast({ title: "Subject renamed" });
  };

  const removeSubject = (id: string) => {
    if (subjects.length <= 1) {
      toast({ title: "Cannot delete", description: "At least one subject required.", variant: "destructive" });
      return;
    }
    const next = subjects.filter((s) => s.id !== id);
    setSubjects(next);
    setStudents((prev) =>
      prev.map((s) => {
        const { [id]: _, ...rest } = s.marks;
        return { ...s, marks: rest, history: s.history.filter((h) => h.subjectId !== id) };
      }),
    );
    if (activeSubjectId === id) setActiveSubjectId(next[0].id);
    toast({ title: "Subject removed" });
  };

  const liveHistoryStudent = historyFor ? students.find((s) => s.id === historyFor.id) ?? null : null;
  const subjectName = (sid: string) => subjects.find((s) => s.id === sid)?.name ?? "—";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold text-gold-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold tracking-tight">Mentor Dashboard</h1>
              <p className="text-xs text-primary-foreground/70">
                Subject-wise IA /60 · Assignments /40 · live totals & history
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="mentor" className="text-xs text-primary-foreground/70">
              Signed in as
            </Label>
            <Input
              id="mentor"
              value={mentor}
              onChange={(e) => setMentor(e.target.value)}
              className="h-8 w-40 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50"
              placeholder="Mentor name"
              maxLength={40}
            />
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-8">
        {/* Subjects manager */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-gold" />
              Subjects
              <span className="text-xs font-normal text-muted-foreground">
                ({subjects.length}/{MAX_SUBJECTS})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {subjects.map((sub) => {
                const isActive = sub.id === activeSubjectId;
                const isEditing = editingSubjectId === sub.id;
                return (
                  <div
                    key={sub.id}
                    className={[
                      "flex items-center gap-1 rounded-full border px-2 py-1 text-sm transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-accent",
                    ].join(" ")}
                  >
                    {isEditing ? (
                      <>
                        <Input
                          autoFocus
                          value={subjectDraft}
                          onChange={(e) => setSubjectDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveSubjectName();
                            if (e.key === "Escape") setEditingSubjectId(null);
                          }}
                          className="h-7 w-40 text-foreground"
                          maxLength={40}
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveSubjectName} aria-label="Save">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setEditingSubjectId(null)}
                          aria-label="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveSubjectId(sub.id)}
                          className="px-2 py-0.5 font-medium"
                        >
                          {sub.name}
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-6 w-6 ${isActive ? "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" : ""}`}
                          onClick={() => startEditSubject(sub)}
                          aria-label={`Rename ${sub.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-6 w-6 ${isActive ? "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" : ""}`}
                          onClick={() => removeSubject(sub.id)}
                          aria-label={`Delete ${sub.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="newSubject" className="text-xs">
                  Add subject
                </Label>
                <Input
                  id="newSubject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addSubject();
                  }}
                  placeholder="e.g. Computer Networks"
                  maxLength={40}
                  disabled={subjects.length >= MAX_SUBJECTS}
                />
              </div>
              <Button
                onClick={addSubject}
                disabled={!newSubject.trim() || subjects.length >= MAX_SUBJECTS}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <section aria-label="Class statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Students", value: stats.total, tone: "primary" },
            { label: "Pass", value: stats.pass, tone: "success" },
            { label: "Fail", value: stats.fail, tone: "destructive" },
            { label: "Pending", value: stats.pending, tone: "muted" },
          ].map((s) => (
            <Card
              key={s.label}
              className="border-l-4"
              style={{ borderLeftColor: `hsl(var(--${s.tone === "muted" ? "border" : s.tone}))` }}
            >
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Add / Edit form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit student" : "Add student"} ·{" "}
              <span className="text-gold">{activeSubject?.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Full name"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roll">Roll no</Label>
                <Input
                  id="roll"
                  value={draft.rollNo}
                  onChange={(e) => setDraft({ ...draft, rollNo: e.target.value })}
                  placeholder="CS-004"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ia1">IA1 /60</Label>
                <Input id="ia1" type="number" min={0} max={IA_MAX}
                  value={draft.ia1} onChange={(e) => setDraft({ ...draft, ia1: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ia2">IA2 /60</Label>
                <Input id="ia2" type="number" min={0} max={IA_MAX}
                  value={draft.ia2} onChange={(e) => setDraft({ ...draft, ia2: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a1">A1 /40</Label>
                <Input id="a1" type="number" min={0} max={ASSIGN_MAX}
                  value={draft.a1} onChange={(e) => setDraft({ ...draft, a1: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a2">A2 /40</Label>
                <Input id="a2" type="number" min={0} max={ASSIGN_MAX}
                  value={draft.a2} onChange={(e) => setDraft({ ...draft, a2: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                {editingId ? "Save changes" : "Add student"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Real-time table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Students · live marks ·{" "}
              <span className="text-gold">{activeSubject?.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24">IA1 /60</TableHead>
                    <TableHead className="w-24">IA2 /60</TableHead>
                    <TableHead className="w-24">A1 /40</TableHead>
                    <TableHead className="w-24">A2 /40</TableHead>
                    <TableHead className="w-28">Assign /80</TableHead>
                    <TableHead className="w-28">Total /200</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                        No students yet. Add one above.
                      </TableCell>
                    </TableRow>
                  )}
                  {students.map((s) => {
                    const m = getMarks(s, activeSubject.id);
                    const status = computeStatus(m.ia1, m.ia2);
                    const assignTotal = (m.a1 ?? 0) + (m.a2 ?? 0);
                    const grandTotal = (m.ia1 ?? 0) + (m.ia2 ?? 0) + assignTotal;
                    const fields: FieldKey[] = ["ia1", "ia2", "a1", "a2"];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.rollNo}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        {fields.map((f) => (
                          <TableCell key={f}>
                            <Input
                              type="number"
                              min={0}
                              max={FIELD_MAX[f]}
                              value={m[f] ?? ""}
                              onChange={(e) => updateField(s.id, f, e.target.value)}
                              onBlur={(e) => commitField(s.id, f, m[f], e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              }}
                              className="h-8"
                              aria-label={`${FIELD_LABEL[f]} for ${s.name} in ${activeSubject.name}`}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="font-semibold">
                          {m.a1 != null && m.a2 != null ? `${assignTotal}/80` : "—"}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {m.ia1 != null && m.ia2 != null && m.a1 != null && m.a2 != null
                            ? `${grandTotal}/200`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              status.tone === "success" && "bg-success/15 text-success",
                              status.tone === "destructive" && "bg-destructive/15 text-destructive",
                              status.tone === "muted" && "bg-muted text-muted-foreground",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setHistoryFor(s)} aria-label={`History for ${s.name}`}>
                              <History className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => startEdit(s)} aria-label={`Edit ${s.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeStudent(s.id)} aria-label={`Delete ${s.name}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Pass criterion (per subject): ≥ {IA_PASS}/60 in <em>both</em> IA1 and IA2. Edits log to history on blur or Enter.
        </p>
      </main>

      {/* History dialog (all subjects) */}
      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Change history · {liveHistoryStudent?.name}{" "}
              <span className="font-mono text-xs text-muted-foreground">
                ({liveHistoryStudent?.rollNo})
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {!liveHistoryStudent || liveHistoryStudent.history.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No edits yet. Changes you make to marks will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {liveHistoryStudent.history.map((h) => (
                  <li key={h.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="text-sm">
                      <p>
                        <span className="rounded bg-gold/20 px-1.5 py-0.5 text-xs font-medium text-gold-foreground">
                          {subjectName(h.subjectId)}
                        </span>{" "}
                        <span className="font-medium">{FIELD_LABEL[h.field]}</span>{" "}
                        <span className="text-muted-foreground">
                          {h.from ?? "—"} → <span className="font-semibold text-foreground">{h.to ?? "—"}</span>
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        by <span className="font-medium text-foreground">{h.mentor}</span> · {fmtTime(h.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
