import { useCallback, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Banner, Chips, PageTitle, Panel } from "@/components/Blocks";
import { Loading, Screen } from "@/components/Screen";
import { createPost, editPost, EVENT_TYPES, FEED_TYPES, loadThread, pickPostPhoto, postType } from "@/lib/feed";
import { colors, ui } from "@/theme";

export default function NewPostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const editing = Number(params.id) || 0;
  const opened = typeof params.kind === "string" ? params.kind : "update";
  const types = opened === "poll" ? [postType("poll")] : opened === "event" || opened === "celebration" ? EVENT_TYPES : FEED_TYPES;
  const [kind, setKind] = useState(types.some((item) => item.value === opened) ? opened : types[0].value);
  const [body, setBody] = useState("");
  const [eventOn, setEventOn] = useState("");
  const [choices, setChoices] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [photo, setPhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(!editing);

  const load = useCallback(async () => {
    if (!editing) return;
    try {
      const thread = await loadThread(editing);
      setKind(thread.post.kind);
      setBody(thread.post.body);
      setEventOn(thread.post.startsOn || "");
      setMultiple(thread.post.multiple);
      setChoices(thread.post.options.length ? thread.post.options.map((option) => option.label) : ["", ""]);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load that post.");
    } finally {
      setReady(true);
    }
  }, [editing]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const type = postType(kind);

  async function addPhoto() {
    setMessage("");
    try {
      const picked = await pickPostPhoto();
      if (picked) setPhoto(picked);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open your photos.");
    }
  }

  async function submit() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      if (editing) {
        try {
          await editPost(editing, body, type.dated ? eventOn : null, photo);
        } catch (error) {
          const note = error instanceof Error ? error.message : "Could not save that.";
          if (photo && /photo/i.test(note)) {
            throw new Error(`${note} The words were saved.`);
          }
          throw error;
        }
        router.replace(`/(resident)/post/${editing}`);
        return;
      }
      const id = await createPost({
        kind,
        message: body,
        eventOn: type.dated ? eventOn : null,
        choices: kind === "poll" ? choices : undefined,
        multiple,
        photo: type.photo ? photo : null,
      });
      router.replace(`/(resident)/post/${id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not post. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PageTitle kicker={editing ? "Edit" : "Community"} title={editing ? "Edit post" : type.label} detail={type.prompt} />
      {!ready ? <Loading /> : null}
      {!editing && types.length > 1 ? (
        <Chips options={types} value={kind} onChange={setKind} />
      ) : null}
      <Panel>
        <Text style={ui.label}>Writing</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={type.prompt}
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { minHeight: 140, textAlignVertical: "top", backgroundColor: colors.page, borderWidth: 0 }]}
          multiline
          maxLength={kind === "quote" ? 240 : 4000}
        />
        {kind === "quote" ? <Text style={ui.meta}>{body.length} / 240</Text> : null}
      </Panel>
      {type.dated ? (
        <Panel>
          <Text style={ui.label}>Date</Text>
          <TextInput
            value={eventOn}
            onChangeText={setEventOn}
            placeholder="2026-10-12"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
          />
          <Text style={ui.meta}>Year, month, and day. The time and place go in the description.</Text>
        </Panel>
      ) : null}
      {kind === "poll" && !editing ? (
        <Panel>
          <Text style={ui.label}>{multiple ? "More than one choice" : "One choice"}</Text>
          {choices.map((choice, index) => (
            <TextInput
              key={index}
              value={choice}
              onChangeText={(value) => setChoices(choices.map((item, itemIndex) => itemIndex === index ? value : item))}
              placeholder={`Choice ${index + 1}`}
              placeholderTextColor={colors.placeholder}
              style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
              maxLength={80}
            />
          ))}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {choices.length < 6 ? (
              <Pressable onPress={() => setChoices([...choices, ""])}>
                <Text style={ui.quietText}>Add a choice</Text>
              </Pressable>
            ) : <View />}
            <Pressable onPress={() => setMultiple((value) => !value)}>
              <Text style={ui.quietText}>{multiple ? "Single choice" : "Several choices"}</Text>
            </Pressable>
          </View>
        </Panel>
      ) : null}
      {editing && kind === "poll" ? <Text style={ui.meta}>Poll choices stay as they were posted.</Text> : null}
      {type.photo ? (
        <Panel>
          <Text style={ui.label}>Photo</Text>
          {photo ? <Image source={{ uri: photo.uri }} style={{ width: "100%", height: 180, borderRadius: 16 }} /> : null}
          <Pressable onPress={addPhoto} style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
            <Text style={[ui.buttonText, { color: colors.button }]}>{photo ? "Change photo" : "Add a photo"}</Text>
          </Pressable>
          <Text style={ui.meta}>
            {editing
              ? "JPEG, PNG, or WebP, up to 5 MB. If the photo does not save, the words still stay."
              : "JPEG, PNG, or WebP, up to 5 MB. A new post with a photo is kept only after that photo is stored."}
          </Text>
        </Panel>
      ) : null}
      <Pressable onPress={submit} disabled={saving} style={ui.button}>
        <Text style={ui.buttonText}>{saving ? "Saving…" : editing ? "Save" : "Post"}</Text>
      </Pressable>
      {message ? <Banner text={message} /> : null}
    </Screen>
  );
}
