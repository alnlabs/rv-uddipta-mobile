import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import {
  HOME_KIND_OPTIONS,
  JOIN_PATH_OPTIONS,
  WORK_KIND_OPTIONS,
  joinKindLabel,
  type HomeJoinKind,
  type JoinPath,
  type WorkJoinKind,
} from "@/lib/join";
import { chooseBrowse, loadRegistration, submitRegistration } from "@/lib/office";
import { pathForAccount } from "@/lib/place";
import { loadAccount } from "@/lib/community";
import { colors, ui } from "@/theme";

type Step = 1 | 2 | 3;

export default function JoinScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [path, setPath] = useState<JoinPath | "">("");
  const [kind, setKind] = useState<HomeJoinKind | WorkJoinKind | "">("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [whyNote, setWhyNote] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof loadRegistration>> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await loadRegistration();
      setStatus(data);
      if (data.name) setOwnerName(data.name);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your request.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit() {
    if (saving || !kind) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await submitRegistration({
        kind,
        phone,
        ownerName,
        flatNumber: path === "home" ? flatNumber : flatNumber || undefined,
        whyNote,
      });
      setMessage(result.message);
      await load();
      router.replace("/(public)");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send your request.");
    } finally {
      setSaving(false);
    }
  }

  async function browse() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      await chooseBrowse();
      const account = await loadAccount();
      router.replace(pathForAccount(account));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open public pages.");
    } finally {
      setSaving(false);
    }
  }

  const pending = status?.request?.status === "pending";
  const linked = Boolean(status?.flatNumber) || (status?.role && status.role !== "visitor");
  const rejected = status?.request?.status === "rejected";

  if (pending) {
    return (
      <Screen title="Waiting" onRefresh={load} busy={!ready && !message}>
        <Note
          text={
            status?.request?.flatNumber
              ? `Waiting for approval on ${status.request.flatNumber} (${joinKindLabel(status.request.kind)}).`
              : `Waiting for approval as ${joinKindLabel(status?.request?.kind)}.`
          }
        />
        <Text style={ui.body}>Until the office approves, you can browse public apartment pages.</Text>
        <Pressable onPress={() => router.replace("/(public)")} style={ui.button}>
          <Text style={ui.buttonText}>Open public pages</Text>
        </Pressable>
        {message ? <Note text={message} /> : null}
      </Screen>
    );
  }

  if (linked) {
    return (
      <Screen title="Access ready" onRefresh={load} busy={!ready && !message}>
        <Note text="Your access is ready." tone="ok" />
        <Pressable
          onPress={async () => {
            const account = await loadAccount();
            router.replace(pathForAccount(account));
          }}
          style={ui.button}
        >
          <Text style={ui.buttonText}>Continue</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen title="Join" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>
        Step {step} of 3. Tell the office who you are. Browse stays public until they approve a request.
      </Text>
      {rejected ? (
        <Note text={status?.request?.reason || "That request was not approved. You can send a new one."} />
      ) : null}

      {step === 1 ? (
        <View style={{ gap: 10 }}>
          {JOIN_PATH_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setPath(option.value);
                setKind("");
                if (option.value === "browse") return;
                setStep(2);
              }}
              style={[
                ui.card,
                path === option.value ? { borderColor: colors.gold } : null,
              ]}
            >
              <Text style={ui.cardTitle}>{option.label}</Text>
              <Text style={ui.body}>{option.help}</Text>
            </Pressable>
          ))}
          {path === "browse" ? (
            <View style={{ gap: 10 }}>
              <Pressable disabled={saving} onPress={browse} style={ui.button}>
                <Text style={ui.buttonText}>{saving ? "Opening…" : "Continue to public pages"}</Text>
              </Pressable>
              <Pressable onPress={() => setPath("")} style={ui.quiet}>
                <Text style={ui.quietText}>Back</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {step === 2 && path === "home" ? (
        <View style={{ gap: 10 }}>
          {HOME_KIND_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setKind(option.value)}
              style={[ui.card, kind === option.value ? { borderColor: colors.gold } : null]}
            >
              <Text style={ui.cardTitle}>{option.label}</Text>
            </Pressable>
          ))}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={() => setStep(1)} style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
              <Text style={[ui.buttonText, { color: colors.button }]}>Back</Text>
            </Pressable>
            <Pressable
              disabled={!kind}
              onPress={() => kind && setStep(3)}
              style={[ui.button, { flex: 1, opacity: kind ? 1 : 0.5 }]}
            >
              <Text style={ui.buttonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === 2 && path === "work" ? (
        <View style={{ gap: 10 }}>
          {WORK_KIND_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setKind(option.value)}
              style={[ui.card, kind === option.value ? { borderColor: colors.gold } : null]}
            >
              <Text style={ui.cardTitle}>{option.label}</Text>
            </Pressable>
          ))}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={() => setStep(1)} style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
              <Text style={[ui.buttonText, { color: colors.button }]}>Back</Text>
            </Pressable>
            <Pressable
              disabled={!kind}
              onPress={() => kind && setStep(3)}
              style={[ui.button, { flex: 1, opacity: kind ? 1 : 0.5 }]}
            >
              <Text style={ui.buttonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === 3 && kind && (path === "home" || path === "work") ? (
        <View style={ui.card}>
          <Text style={ui.label}>I am</Text>
          <Text style={ui.cardTitle}>{joinKindLabel(kind)}</Text>
          <TextInput
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Your name"
            placeholderTextColor={colors.placeholder}
            style={ui.field}
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit phone"
            placeholderTextColor={colors.placeholder}
            style={ui.field}
            keyboardType="phone-pad"
          />
          {path === "home" ? (
            <TextInput
              value={flatNumber}
              onChangeText={setFlatNumber}
              autoCapitalize="characters"
              placeholder="Flat, for example A101"
              placeholderTextColor={colors.placeholder}
              style={ui.field}
            />
          ) : (
            <TextInput
              value={flatNumber}
              onChangeText={setFlatNumber}
              autoCapitalize="characters"
              placeholder="Flat (optional)"
              placeholderTextColor={colors.placeholder}
              style={ui.field}
            />
          )}
          <TextInput
            value={whyNote}
            onChangeText={setWhyNote}
            placeholder={path === "work" ? "Why / who engaged you" : "Why you need access"}
            placeholderTextColor={colors.placeholder}
            style={[ui.field, { minHeight: 88, textAlignVertical: "top" }]}
            multiline
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={() => setStep(2)} style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
              <Text style={[ui.buttonText, { color: colors.button }]}>Back</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={submit} style={[ui.button, { flex: 1 }]}>
              <Text style={ui.buttonText}>{saving ? "Sending…" : "Send"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
