import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Banner, Panel } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import { createQuery } from "@/lib/feed";
import { colors, ui } from "@/theme";

const KINDS = [
  { value: "text", label: "Short" },
  { value: "long", label: "Long" },
  { value: "date", label: "Date" },
  { value: "choice", label: "Choice" },
] as const;

type Draft = {
  id: number
  label: string
  kind: (typeof KINDS)[number]["value"]
  required: boolean
  choices: string
};

let nextDraftId = 2;

export default function NewQueryScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [questions, setQuestions] = useState<Draft[]>([
    { id: 1, label: "", kind: "text", required: true, choices: "" },
  ]);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    const id = nextDraftId;
    nextDraftId += 1;
    setQuestions((current) => [...current, { id, label: "", kind: "text", required: false, choices: "" }]);
  }

  function patch(id: number, next: Partial<Draft>) {
    setQuestions((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  async function save() {
    if (saving) return;
    if (title.trim().length < 2) {
      setTone("error");
      setMessage("Give the query a title.");
      return;
    }
    if (questions.some((item) => item.label.trim().length < 2)) {
      setTone("error");
      setMessage("Each question needs a label.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await createQuery({
        title,
        note,
        visibility: "private",
        resultsView: "community",
        questions: questions.map((item) => ({
          label: item.label,
          kind: item.kind,
          required: item.required,
          choices: item.choices,
        })),
      });
      router.replace(`/(resident)/form/${result.id}`);
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not create that query.");
      setSaving(false);
    }
  }

  return (
    <Screen title="New query">
      <Text style={ui.body}>Ask every home. One answer per flat.</Text>
      {message ? <Banner text={message} tone={tone} /> : null}
      <Panel>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note (optional)"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0, minHeight: 72 }]}
          multiline
        />
      </Panel>
      {questions.map((question, index) => (
        <Panel key={question.id}>
          <Text style={ui.label}>Question {index + 1}</Text>
          <TextInput
            value={question.label}
            onChangeText={(value) => patch(question.id, { label: value })}
            placeholder="Question"
            placeholderTextColor={colors.placeholder}
            style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {KINDS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => patch(question.id, { kind: item.value })}
                style={[
                  ui.button,
                  {
                    paddingHorizontal: 12,
                    backgroundColor: question.kind === item.value ? colors.button : colors.white,
                    borderWidth: 1,
                    borderColor: colors.button,
                  },
                ]}
              >
                <Text style={[ui.buttonText, { color: question.kind === item.value ? colors.onButton : colors.button, fontSize: 13 }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {question.kind === "choice" ? (
            <TextInput
              value={question.choices}
              onChangeText={(value) => patch(question.id, { choices: value })}
              placeholder={"Options, one per line\nMorning\nEvening"}
              placeholderTextColor={colors.placeholder}
              style={[ui.field, { backgroundColor: colors.page, borderWidth: 0, minHeight: 90 }]}
              multiline
            />
          ) : null}
          <Pressable
            onPress={() => patch(question.id, { required: !question.required })}
            style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }]}
          >
            <Text style={[ui.buttonText, { color: colors.ink }]}>
              {question.required ? "Required" : "Optional"}
            </Text>
          </Pressable>
          {questions.length > 1 ? (
            <Pressable
              onPress={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
              style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.danger }]}
            >
              <Text style={[ui.buttonText, { color: colors.danger }]}>Remove</Text>
            </Pressable>
          ) : null}
        </Panel>
      ))}
      <Pressable
        onPress={addQuestion}
        style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
      >
        <Text style={[ui.buttonText, { color: colors.button }]}>Add question</Text>
      </Pressable>
      <Pressable disabled={saving} onPress={save} style={ui.button}>
        <Text style={ui.buttonText}>{saving ? "Creating…" : "Create query"}</Text>
      </Pressable>
    </Screen>
  );
}
