import { patcher } from "@vendetta";
import { findByName, findByProps } from "@vendetta/metro";
import { ReactNative } from "@vendetta/metro/common";
import { getAssetByName } from "@vendetta/ui/assets";
import { React } from "@vendetta/metro/common";

let unpatches: Function[] = [];
let enabled: boolean = false;
let targetLang: string = "en"; // Langue par défaut

// Fonction de traduction via l'API Google Translate
async function translateText(text: string, lang: string): Promise<string> {
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(
      text
    )}`
  );
  const data = await response.json();
  return data[0][0][0];
}

// Composant de bouton d'activation/désactivation
function TranslationToggle() {
  const [active, setActive] = React.useState(enabled);

  return (
    <Text
      style={{
        marginLeft: 10,
        color: active ? "green" : "red",
        fontSize: 16,
      }}
      onPress={() => {
        enabled = !enabled;
        setActive(enabled);
      }}
    >
      {active ? "Traduction activée" : "Traduction désactivée"}
    </Text>
  );
}

export default {
  onLoad: () => {
    // Patcher le composant Chat pour ajouter le bouton d'activation
    const Chat = findByName("Chat", false);
    unpatches.push(
      patcher.after("render", Chat.prototype, (_args, res) => {
        const chatHeader = findInReactTree(res, (n) => n?.props?.children);
        if (chatHeader && !chatHeader.props.children.includes(TranslationToggle)) {
          chatHeader.props.children.push(<TranslationToggle />);
        }
      })
    );

    // Patcher l'envoi des messages pour les traduire avant envoi
    const { DCDChatManager } = ReactNative.NativeModules;
    unpatches.push(
      patcher.before("updateRows", DCDChatManager, async (args) => {
        const rows = JSON.parse(args[1]);

        for (const row of rows) {
          if (enabled && row.type === 1 && row.message.content) {
            row.message.content = await translateText(row.message.content, targetLang);
          }
        }

        args[1] = JSON.stringify(rows);
      })
    );
  },

  onUnload: () => {
    unpatches.forEach((unpatch) => unpatch());
  },
};

