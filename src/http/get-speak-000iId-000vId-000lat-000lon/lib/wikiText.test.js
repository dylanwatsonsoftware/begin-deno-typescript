const test = require("ava");
const fs = require("fs");
const path = require("path");

const { getPage } = require("../speakController");
const wikiText = require("./wikiText");

const warwickJson = require("./fixtures/warwick.json");
const santaBarbara = require("./fixtures/santabarbara.json");

const { transform } = wikiText;

const warwickFixed = fs.readFileSync(
  path.join(__dirname, "fixtures/warwick-fixed.txt"),
  {
    encoding: "utf-8",
  }
);

const santaBarbaraFixed = fs.readFileSync(
  path.join(__dirname, "fixtures/santabarbara-fixed.txt"),
  {
    encoding: "utf-8",
  }
);

test("that 'welcome to' is added", async (t) => {
  const locationText = "Cle Elum, Washington";
  const text = {
    data: {
      batchcomplete: "",
      warnings: {
        extracts: {
          "*":
            '"exlimit" was too large for a whole article extracts request, lowered to 1.\nHTML may be malformed and/or unbalanced and may omit inline images. Use at your own risk. Known problems are listed at https://www.mediawiki.org/wiki/Extension:TextExtracts#Caveats.',
        },
      },
      query: {
        pages: {
          138056: {
            pageid: 138056,
            ns: 0,
            title: "Cle Elum, Washington",
            extract: "Cle Elum is a",
          },
        },
      },
    },
  };

  const result = await transform(locationText, getPage(text));

  t.is(result.text, "Welcome to Cle Elum, Washington. Cle Elum is a");
});

test("that heading 3's are fixed", async (t) => {
  const locationText = "Cle Elum, Washington";
  const text = {
    data: {
      batchcomplete: "",
      warnings: {
        extracts: {
          "*":
            '"exlimit" was too large for a whole article extracts request, lowered to 1.\nHTML may be malformed and/or unbalanced and may omit inline images. Use at your own risk. Known problems are listed at https://www.mediawiki.org/wiki/Extension:TextExtracts#Caveats.',
        },
      },
      query: {
        pages: {
          138056: {
            pageid: 138056,
            ns: 0,
            title: "Cle Elum, Washington",
            extract:
              "Cle Elum is a place.\n\n\n=== Spanish period ===\n\nThis kind of place.",
          },
        },
      },
    },
  };

  const result = await transform(locationText, getPage(text));

  t.is(
    result.text,
    "Welcome to Cle Elum, Washington. Cle Elum is a place. Spanish period. This kind of place."
  );
});

test("that heading 4's are fixed", async (t) => {
  const locationText = "Cle Elum, Washington";
  const text = {
    data: {
      batchcomplete: "",
      warnings: {
        extracts: {
          "*":
            '"exlimit" was too large for a whole article extracts request, lowered to 1.\nHTML may be malformed and/or unbalanced and may omit inline images. Use at your own risk. Known problems are listed at https://www.mediawiki.org/wiki/Extension:TextExtracts#Caveats.',
        },
      },
      query: {
        pages: {
          138056: {
            pageid: 138056,
            ns: 0,
            title: "Cle Elum, Washington",
            extract:
              "Cle Elum is a place.\n\n\n==== Spanish period ====\n\nThis kind of place.",
          },
        },
      },
    },
  };

  const result = await transform(locationText, getPage(text));

  t.is(
    result.text,
    "Welcome to Cle Elum, Washington. Cle Elum is a place. Spanish period. This kind of place."
  );
});

test("that 2 letter abbreviations work out", async (t) => {
  const locationText = "Cle Elum, Washington";
  const text = {
    data: {
      batchcomplete: "",
      warnings: {
        extracts: {
          "*":
            '"exlimit" was too large for a whole article extracts request, lowered to 1.\nHTML may be malformed and/or unbalanced and may omit inline images. Use at your own risk. Known problems are listed at https://www.mediawiki.org/wiki/Extension:TextExtracts#Caveats.',
        },
      },
      query: {
        pages: {
          138056: {
            pageid: 138056,
            ns: 0,
            title: "Cle Elum, Washington",
            extract: "Cle Elum is a place in U.S. ",
          },
        },
      },
    },
  };

  const result = await transform(locationText, getPage(text));

  t.is(
    result.text,
    "Welcome to Cle Elum, Washington. Cle Elum is a place in U.S."
  );
});

test("that 5 letter abbreviations work out", async (t) => {
  const locationText = "Cle Elum, Washington";
  const text = {
    data: {
      batchcomplete: "",
      warnings: {
        extracts: {
          "*":
            '"exlimit" was too large for a whole article extracts request, lowered to 1.\nHTML may be malformed and/or unbalanced and may omit inline images. Use at your own risk. Known problems are listed at https://www.mediawiki.org/wiki/Extension:TextExtracts#Caveats.',
        },
      },
      query: {
        pages: {
          138056: {
            pageid: 138056,
            ns: 0,
            title: "Cle Elum, Washington",
            extract: "Cle Elum is a place in U.S.P.C.A. ",
          },
        },
      },
    },
  };

  const result = await transform(locationText, getPage(text));

  t.is(
    result.text,
    "Welcome to Cle Elum, Washington. Cle Elum is a place in U.S.P.C.A."
  );
});

test("that we can process a smaller bigger doc", async (t) => {
  const locationText = "Warwick, Western Australia";
  const text = {
    data: warwickJson,
  };

  const result = await transform(locationText, getPage(text));

  t.is(result.text, warwickFixed);
});

test("that we can process a bigger doc", async (t) => {
  const locationText = "Santa Barbara, California";
  const text = {
    data: santaBarbara,
  };

  const result = await transform(locationText, getPage(text));

  t.is(result.text, santaBarbaraFixed);
});

test("that we fail when there is no pageId", async (t) => {
  const text = { data: { query: { pages: [] } } };

  const e = await t.throws(() => getPage(text));

  t.is(e.status, 500);
});

test("that we fail when pageId is undefined", async (t) => {
  const text = { data: { query: { pages: undefined } } };

  const e = await t.throws(() => getPage(text));
  t.is(e.status, 500);
});
