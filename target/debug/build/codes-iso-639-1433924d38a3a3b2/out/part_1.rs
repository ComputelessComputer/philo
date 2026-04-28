use codes_agency::{Agency, Standard, standardized_type};
use codes_common::{code_impl, error, fixed_length_code};
use crate::LanguageCodeError;
use std::str::FromStr;

#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};

// ------------------------------------------------------------------------------------------------
// Public Types
// ------------------------------------------------------------------------------------------------

///
/// An instance of the `Standard` struct defined in the
/// [`codes_agency`](https://docs.rs/codes-agency/latest/codes_agency/)
/// package that describes the ISO-639-1 specification.
///
pub const ISO_639_1: Standard = Standard::new_with_long_ref(
    Agency::ISO,
    "639-1",
    "ISO 639-1:2002",
    "Codes for the representation of names of languages — Part 1: Alpha-2 code",
    "https://www.iso.org/standard/22109.html",
);

/// 
/// A Language Code enumeration representing the two-letter
/// 639-1 identifier.
/// 
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
pub enum LanguageCode {
    /// Afar
    Aa,
    /// Abkhazian
    Ab,
    /// Avestan
    Ae,
    /// Afrikaans
    Af,
    /// Akan
    Ak,
    /// Amharic
    Am,
    /// Aragonese
    An,
    /// Arabic
    Ar,
    /// Assamese
    As,
    /// Avaric
    Av,
    /// Aymara
    Ay,
    /// Azerbaijani
    Az,
    /// Bashkir
    Ba,
    /// Belarusian
    Be,
    /// Bulgarian
    Bg,
    /// Bihari languages
    Bh,
    /// Bislama
    Bi,
    /// Bambara
    Bm,
    /// Bengali
    Bn,
    /// Tibetan
    Bo,
    /// Breton
    Br,
    /// Bosnian
    Bs,
    /// Catalan ;   Valencian
    Ca,
    /// Chechen
    Ce,
    /// Chamorro
    Ch,
    /// Corsican
    Co,
    /// Cree
    Cr,
    /// Czech
    Cs,
    /// Church Slavic ;   Old Slavonic ;   Church Slavonic ;   Old Bulgarian ;   Old Church Slavonic
    Cu,
    /// Chuvash
    Cv,
    /// Welsh
    Cy,
    /// Danish
    Da,
    /// German
    De,
    /// Divehi ;   Dhivehi ;   Maldivian
    Dv,
    /// Dzongkha
    Dz,
    /// Ewe
    Ee,
    /// Greek, Modern (1453-)
    El,
    /// English
    En,
    /// Esperanto
    Eo,
    /// Spanish ;   Castilian
    Es,
    /// Estonian
    Et,
    /// Basque
    Eu,
    /// Persian
    Fa,
    /// Fulah
    Ff,
    /// Finnish
    Fi,
    /// Fijian
    Fj,
    /// Faroese
    Fo,
    /// French
    Fr,
    /// Western Frisian
    Fy,
    /// Irish
    Ga,
    /// Gaelic ;   Scottish Gaelic
    Gd,
    /// Galician
    Gl,
    /// Guarani
    Gn,
    /// Gujarati
    Gu,
    /// Manx
    Gv,
    /// Hausa
    Ha,
    /// Hebrew
    He,
    /// Hindi
    Hi,
    /// Hiri Motu
    Ho,
    /// Croatian
    Hr,
    /// Haitian ;   Haitian Creole
    Ht,
    /// Hungarian
    Hu,
    /// Armenian
    Hy,
    /// Herero
    Hz,
    /// Interlingua (International Auxiliary Language Association)
    Ia,
    /// Indonesian
    Id,
    /// Interlingue ;   Occidental
    Ie,
    /// Igbo
    Ig,
    /// Sichuan Yi ;   Nuosu
    Ii,
    /// Inupiaq
    Ik,
    /// Ido
    Io,
    /// Icelandic
    Is,
    /// Italian
    It,
    /// Inuktitut
    Iu,
    /// Japanese
    Ja,
    /// Javanese
    Jv,
    /// Georgian
    Ka,
    /// Kongo
    Kg,
    /// Kikuyu ;   Gikuyu
    Ki,
    /// Kuanyama ;   Kwanyama
    Kj,
    /// Kazakh
    Kk,
    /// Kalaallisut ;   Greenlandic
    Kl,
    /// Central Khmer
    Km,
    /// Kannada
    Kn,
    /// Korean
    Ko,
    /// Kanuri
    Kr,
    /// Kashmiri
    Ks,
    /// Kurdish
    Ku,
    /// Komi
    Kv,
    /// Cornish
    Kw,
    /// Kirghiz ;   Kyrgyz
    Ky,
    /// Latin
    La,
    /// Luxembourgish ;   Letzeburgesch
    Lb,
    /// Ganda
    Lg,
    /// Limburgan ;   Limburger ;   Limburgish
    Li,
    /// Lingala
    Ln,
    /// Lao
    Lo,
    /// Lithuanian
    Lt,
    /// Luba-Katanga
    Lu,
    /// Latvian
    Lv,
    /// Malagasy
    Mg,
    /// Marshallese
    Mh,
    /// Maori
    Mi,
    /// Macedonian
    Mk,
    /// Malayalam
    Ml,
    /// Mongolian
    Mn,
    /// Marathi
    Mr,
    /// Malay
    Ms,
    /// Maltese
    Mt,
    /// Burmese
    My,
    /// Nauru
    Na,
    /// Bokmål, Norwegian ;   Norwegian Bokmål
    Nb,
    /// Ndebele, North ;   North Ndebele
    Nd,
    /// Nepali
    Ne,
    /// Ndonga
    Ng,
    /// Dutch ;   Flemish
    Nl,
    /// Norwegian Nynorsk ;   Nynorsk, Norwegian
    Nn,
    /// Norwegian
    No,
    /// Ndebele, South ;   South Ndebele
    Nr,
    /// Navajo ;   Navaho
    Nv,
    /// Chichewa ;   Chewa ;   Nyanja
    Ny,
    /// Occitan (post 1500)
    Oc,
    /// Ojibwa
    Oj,
    /// Oromo
    Om,
    /// Oriya
    Or,
    /// Ossetian ;   Ossetic
    Os,
    /// Panjabi ;   Punjabi
    Pa,
    /// Pali
    Pi,
    /// Polish
    Pl,
    /// Pushto ;   Pashto
    Ps,
    /// Portuguese
    Pt,
    /// Quechua
    Qu,
    /// Romansh
    Rm,
    /// Rundi
    Rn,
    /// Romanian ;   Moldavian ;   Moldovan
    Ro,
    /// Russian
    Ru,
    /// Kinyarwanda
    Rw,
    /// Sanskrit
    Sa,
    /// Sardinian
    Sc,
    /// Sindhi
    Sd,
    /// Northern Sami
    Se,
    /// Sango
    Sg,
    /// Sinhala ;   Sinhalese
    Si,
    /// Slovak
    Sk,
    /// Slovenian
    Sl,
    /// Samoan
    Sm,
    /// Shona
    Sn,
    /// Somali
    So,
    /// Albanian
    Sq,
    /// Serbian
    Sr,
    /// Swati
    Ss,
    /// Sotho, Southern
    St,
    /// Sundanese
    Su,
    /// Swedish
    Sv,
    /// Swahili
    Sw,
    /// Tamil
    Ta,
    /// Telugu
    Te,
    /// Tajik
    Tg,
    /// Thai
    Th,
    /// Tigrinya
    Ti,
    /// Turkmen
    Tk,
    /// Tagalog
    Tl,
    /// Tswana
    Tn,
    /// Tonga (Tonga Islands)
    To,
    /// Turkish
    Tr,
    /// Tsonga
    Ts,
    /// Tatar
    Tt,
    /// Twi
    Tw,
    /// Tahitian
    Ty,
    /// Uighur ;   Uyghur
    Ug,
    /// Ukrainian
    Uk,
    /// Urdu
    Ur,
    /// Uzbek
    Uz,
    /// Venda
    Ve,
    /// Vietnamese
    Vi,
    /// Volapük
    Vo,
    /// Walloon
    Wa,
    /// Wolof
    Wo,
    /// Xhosa
    Xh,
    /// Yiddish
    Yi,
    /// Yoruba
    Yo,
    /// Zhuang ;   Chuang
    Za,
    /// Chinese
    Zh,
    /// Zulu
    Zu,
}

/// Provides an array of all defined [LanguageCode] codes, useful for queries.
pub const ALL_CODES: [LanguageCode;184] = [
    LanguageCode::Aa,
    LanguageCode::Ab,
    LanguageCode::Ae,
    LanguageCode::Af,
    LanguageCode::Ak,
    LanguageCode::Am,
    LanguageCode::An,
    LanguageCode::Ar,
    LanguageCode::As,
    LanguageCode::Av,
    LanguageCode::Ay,
    LanguageCode::Az,
    LanguageCode::Ba,
    LanguageCode::Be,
    LanguageCode::Bg,
    LanguageCode::Bh,
    LanguageCode::Bi,
    LanguageCode::Bm,
    LanguageCode::Bn,
    LanguageCode::Bo,
    LanguageCode::Br,
    LanguageCode::Bs,
    LanguageCode::Ca,
    LanguageCode::Ce,
    LanguageCode::Ch,
    LanguageCode::Co,
    LanguageCode::Cr,
    LanguageCode::Cs,
    LanguageCode::Cu,
    LanguageCode::Cv,
    LanguageCode::Cy,
    LanguageCode::Da,
    LanguageCode::De,
    LanguageCode::Dv,
    LanguageCode::Dz,
    LanguageCode::Ee,
    LanguageCode::El,
    LanguageCode::En,
    LanguageCode::Eo,
    LanguageCode::Es,
    LanguageCode::Et,
    LanguageCode::Eu,
    LanguageCode::Fa,
    LanguageCode::Ff,
    LanguageCode::Fi,
    LanguageCode::Fj,
    LanguageCode::Fo,
    LanguageCode::Fr,
    LanguageCode::Fy,
    LanguageCode::Ga,
    LanguageCode::Gd,
    LanguageCode::Gl,
    LanguageCode::Gn,
    LanguageCode::Gu,
    LanguageCode::Gv,
    LanguageCode::Ha,
    LanguageCode::He,
    LanguageCode::Hi,
    LanguageCode::Ho,
    LanguageCode::Hr,
    LanguageCode::Ht,
    LanguageCode::Hu,
    LanguageCode::Hy,
    LanguageCode::Hz,
    LanguageCode::Ia,
    LanguageCode::Id,
    LanguageCode::Ie,
    LanguageCode::Ig,
    LanguageCode::Ii,
    LanguageCode::Ik,
    LanguageCode::Io,
    LanguageCode::Is,
    LanguageCode::It,
    LanguageCode::Iu,
    LanguageCode::Ja,
    LanguageCode::Jv,
    LanguageCode::Ka,
    LanguageCode::Kg,
    LanguageCode::Ki,
    LanguageCode::Kj,
    LanguageCode::Kk,
    LanguageCode::Kl,
    LanguageCode::Km,
    LanguageCode::Kn,
    LanguageCode::Ko,
    LanguageCode::Kr,
    LanguageCode::Ks,
    LanguageCode::Ku,
    LanguageCode::Kv,
    LanguageCode::Kw,
    LanguageCode::Ky,
    LanguageCode::La,
    LanguageCode::Lb,
    LanguageCode::Lg,
    LanguageCode::Li,
    LanguageCode::Ln,
    LanguageCode::Lo,
    LanguageCode::Lt,
    LanguageCode::Lu,
    LanguageCode::Lv,
    LanguageCode::Mg,
    LanguageCode::Mh,
    LanguageCode::Mi,
    LanguageCode::Mk,
    LanguageCode::Ml,
    LanguageCode::Mn,
    LanguageCode::Mr,
    LanguageCode::Ms,
    LanguageCode::Mt,
    LanguageCode::My,
    LanguageCode::Na,
    LanguageCode::Nb,
    LanguageCode::Nd,
    LanguageCode::Ne,
    LanguageCode::Ng,
    LanguageCode::Nl,
    LanguageCode::Nn,
    LanguageCode::No,
    LanguageCode::Nr,
    LanguageCode::Nv,
    LanguageCode::Ny,
    LanguageCode::Oc,
    LanguageCode::Oj,
    LanguageCode::Om,
    LanguageCode::Or,
    LanguageCode::Os,
    LanguageCode::Pa,
    LanguageCode::Pi,
    LanguageCode::Pl,
    LanguageCode::Ps,
    LanguageCode::Pt,
    LanguageCode::Qu,
    LanguageCode::Rm,
    LanguageCode::Rn,
    LanguageCode::Ro,
    LanguageCode::Ru,
    LanguageCode::Rw,
    LanguageCode::Sa,
    LanguageCode::Sc,
    LanguageCode::Sd,
    LanguageCode::Se,
    LanguageCode::Sg,
    LanguageCode::Si,
    LanguageCode::Sk,
    LanguageCode::Sl,
    LanguageCode::Sm,
    LanguageCode::Sn,
    LanguageCode::So,
    LanguageCode::Sq,
    LanguageCode::Sr,
    LanguageCode::Ss,
    LanguageCode::St,
    LanguageCode::Su,
    LanguageCode::Sv,
    LanguageCode::Sw,
    LanguageCode::Ta,
    LanguageCode::Te,
    LanguageCode::Tg,
    LanguageCode::Th,
    LanguageCode::Ti,
    LanguageCode::Tk,
    LanguageCode::Tl,
    LanguageCode::Tn,
    LanguageCode::To,
    LanguageCode::Tr,
    LanguageCode::Ts,
    LanguageCode::Tt,
    LanguageCode::Tw,
    LanguageCode::Ty,
    LanguageCode::Ug,
    LanguageCode::Uk,
    LanguageCode::Ur,
    LanguageCode::Uz,
    LanguageCode::Ve,
    LanguageCode::Vi,
    LanguageCode::Vo,
    LanguageCode::Wa,
    LanguageCode::Wo,
    LanguageCode::Xh,
    LanguageCode::Yi,
    LanguageCode::Yo,
    LanguageCode::Za,
    LanguageCode::Zh,
    LanguageCode::Zu,
];

// ------------------------------------------------------------------------------------------------
// Implementations
// ------------------------------------------------------------------------------------------------

impl FromStr for LanguageCode {
    type Err = LanguageCodeError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "aa" => Ok(Self::Aa),
            "ab" => Ok(Self::Ab),
            "ae" => Ok(Self::Ae),
            "af" => Ok(Self::Af),
            "ak" => Ok(Self::Ak),
            "am" => Ok(Self::Am),
            "an" => Ok(Self::An),
            "ar" => Ok(Self::Ar),
            "as" => Ok(Self::As),
            "av" => Ok(Self::Av),
            "ay" => Ok(Self::Ay),
            "az" => Ok(Self::Az),
            "ba" => Ok(Self::Ba),
            "be" => Ok(Self::Be),
            "bg" => Ok(Self::Bg),
            "bh" => Ok(Self::Bh),
            "bi" => Ok(Self::Bi),
            "bm" => Ok(Self::Bm),
            "bn" => Ok(Self::Bn),
            "bo" => Ok(Self::Bo),
            "br" => Ok(Self::Br),
            "bs" => Ok(Self::Bs),
            "ca" => Ok(Self::Ca),
            "ce" => Ok(Self::Ce),
            "ch" => Ok(Self::Ch),
            "co" => Ok(Self::Co),
            "cr" => Ok(Self::Cr),
            "cs" => Ok(Self::Cs),
            "cu" => Ok(Self::Cu),
            "cv" => Ok(Self::Cv),
            "cy" => Ok(Self::Cy),
            "da" => Ok(Self::Da),
            "de" => Ok(Self::De),
            "dv" => Ok(Self::Dv),
            "dz" => Ok(Self::Dz),
            "ee" => Ok(Self::Ee),
            "el" => Ok(Self::El),
            "en" => Ok(Self::En),
            "eo" => Ok(Self::Eo),
            "es" => Ok(Self::Es),
            "et" => Ok(Self::Et),
            "eu" => Ok(Self::Eu),
            "fa" => Ok(Self::Fa),
            "ff" => Ok(Self::Ff),
            "fi" => Ok(Self::Fi),
            "fj" => Ok(Self::Fj),
            "fo" => Ok(Self::Fo),
            "fr" => Ok(Self::Fr),
            "fy" => Ok(Self::Fy),
            "ga" => Ok(Self::Ga),
            "gd" => Ok(Self::Gd),
            "gl" => Ok(Self::Gl),
            "gn" => Ok(Self::Gn),
            "gu" => Ok(Self::Gu),
            "gv" => Ok(Self::Gv),
            "ha" => Ok(Self::Ha),
            "he" => Ok(Self::He),
            "hi" => Ok(Self::Hi),
            "ho" => Ok(Self::Ho),
            "hr" => Ok(Self::Hr),
            "ht" => Ok(Self::Ht),
            "hu" => Ok(Self::Hu),
            "hy" => Ok(Self::Hy),
            "hz" => Ok(Self::Hz),
            "ia" => Ok(Self::Ia),
            "id" => Ok(Self::Id),
            "ie" => Ok(Self::Ie),
            "ig" => Ok(Self::Ig),
            "ii" => Ok(Self::Ii),
            "ik" => Ok(Self::Ik),
            "io" => Ok(Self::Io),
            "is" => Ok(Self::Is),
            "it" => Ok(Self::It),
            "iu" => Ok(Self::Iu),
            "ja" => Ok(Self::Ja),
            "jv" => Ok(Self::Jv),
            "ka" => Ok(Self::Ka),
            "kg" => Ok(Self::Kg),
            "ki" => Ok(Self::Ki),
            "kj" => Ok(Self::Kj),
            "kk" => Ok(Self::Kk),
            "kl" => Ok(Self::Kl),
            "km" => Ok(Self::Km),
            "kn" => Ok(Self::Kn),
            "ko" => Ok(Self::Ko),
            "kr" => Ok(Self::Kr),
            "ks" => Ok(Self::Ks),
            "ku" => Ok(Self::Ku),
            "kv" => Ok(Self::Kv),
            "kw" => Ok(Self::Kw),
            "ky" => Ok(Self::Ky),
            "la" => Ok(Self::La),
            "lb" => Ok(Self::Lb),
            "lg" => Ok(Self::Lg),
            "li" => Ok(Self::Li),
            "ln" => Ok(Self::Ln),
            "lo" => Ok(Self::Lo),
            "lt" => Ok(Self::Lt),
            "lu" => Ok(Self::Lu),
            "lv" => Ok(Self::Lv),
            "mg" => Ok(Self::Mg),
            "mh" => Ok(Self::Mh),
            "mi" => Ok(Self::Mi),
            "mk" => Ok(Self::Mk),
            "ml" => Ok(Self::Ml),
            "mn" => Ok(Self::Mn),
            "mr" => Ok(Self::Mr),
            "ms" => Ok(Self::Ms),
            "mt" => Ok(Self::Mt),
            "my" => Ok(Self::My),
            "na" => Ok(Self::Na),
            "nb" => Ok(Self::Nb),
            "nd" => Ok(Self::Nd),
            "ne" => Ok(Self::Ne),
            "ng" => Ok(Self::Ng),
            "nl" => Ok(Self::Nl),
            "nn" => Ok(Self::Nn),
            "no" => Ok(Self::No),
            "nr" => Ok(Self::Nr),
            "nv" => Ok(Self::Nv),
            "ny" => Ok(Self::Ny),
            "oc" => Ok(Self::Oc),
            "oj" => Ok(Self::Oj),
            "om" => Ok(Self::Om),
            "or" => Ok(Self::Or),
            "os" => Ok(Self::Os),
            "pa" => Ok(Self::Pa),
            "pi" => Ok(Self::Pi),
            "pl" => Ok(Self::Pl),
            "ps" => Ok(Self::Ps),
            "pt" => Ok(Self::Pt),
            "qu" => Ok(Self::Qu),
            "rm" => Ok(Self::Rm),
            "rn" => Ok(Self::Rn),
            "ro" => Ok(Self::Ro),
            "ru" => Ok(Self::Ru),
            "rw" => Ok(Self::Rw),
            "sa" => Ok(Self::Sa),
            "sc" => Ok(Self::Sc),
            "sd" => Ok(Self::Sd),
            "se" => Ok(Self::Se),
            "sg" => Ok(Self::Sg),
            "si" => Ok(Self::Si),
            "sk" => Ok(Self::Sk),
            "sl" => Ok(Self::Sl),
            "sm" => Ok(Self::Sm),
            "sn" => Ok(Self::Sn),
            "so" => Ok(Self::So),
            "sq" => Ok(Self::Sq),
            "sr" => Ok(Self::Sr),
            "ss" => Ok(Self::Ss),
            "st" => Ok(Self::St),
            "su" => Ok(Self::Su),
            "sv" => Ok(Self::Sv),
            "sw" => Ok(Self::Sw),
            "ta" => Ok(Self::Ta),
            "te" => Ok(Self::Te),
            "tg" => Ok(Self::Tg),
            "th" => Ok(Self::Th),
            "ti" => Ok(Self::Ti),
            "tk" => Ok(Self::Tk),
            "tl" => Ok(Self::Tl),
            "tn" => Ok(Self::Tn),
            "to" => Ok(Self::To),
            "tr" => Ok(Self::Tr),
            "ts" => Ok(Self::Ts),
            "tt" => Ok(Self::Tt),
            "tw" => Ok(Self::Tw),
            "ty" => Ok(Self::Ty),
            "ug" => Ok(Self::Ug),
            "uk" => Ok(Self::Uk),
            "ur" => Ok(Self::Ur),
            "uz" => Ok(Self::Uz),
            "ve" => Ok(Self::Ve),
            "vi" => Ok(Self::Vi),
            "vo" => Ok(Self::Vo),
            "wa" => Ok(Self::Wa),
            "wo" => Ok(Self::Wo),
            "xh" => Ok(Self::Xh),
            "yi" => Ok(Self::Yi),
            "yo" => Ok(Self::Yo),
            "za" => Ok(Self::Za),
            "zh" => Ok(Self::Zh),
            "zu" => Ok(Self::Zu),
            _ => Err(error::unknown_value("LanguageCode", s)),
        }
    }
}

code_impl!(LanguageCode);

fixed_length_code!(LanguageCode, 2);

standardized_type!(LanguageCode, ISO_639_1);

impl LanguageCode {
     ///
     /// Returns the ISO 639-1 two-letter code a string.
     ///
     pub fn code(&self) -> &'static str {
         match self {
             Self::Aa => "aa",
             Self::Ab => "ab",
             Self::Ae => "ae",
             Self::Af => "af",
             Self::Ak => "ak",
             Self::Am => "am",
             Self::An => "an",
             Self::Ar => "ar",
             Self::As => "as",
             Self::Av => "av",
             Self::Ay => "ay",
             Self::Az => "az",
             Self::Ba => "ba",
             Self::Be => "be",
             Self::Bg => "bg",
             Self::Bh => "bh",
             Self::Bi => "bi",
             Self::Bm => "bm",
             Self::Bn => "bn",
             Self::Bo => "bo",
             Self::Br => "br",
             Self::Bs => "bs",
             Self::Ca => "ca",
             Self::Ce => "ce",
             Self::Ch => "ch",
             Self::Co => "co",
             Self::Cr => "cr",
             Self::Cs => "cs",
             Self::Cu => "cu",
             Self::Cv => "cv",
             Self::Cy => "cy",
             Self::Da => "da",
             Self::De => "de",
             Self::Dv => "dv",
             Self::Dz => "dz",
             Self::Ee => "ee",
             Self::El => "el",
             Self::En => "en",
             Self::Eo => "eo",
             Self::Es => "es",
             Self::Et => "et",
             Self::Eu => "eu",
             Self::Fa => "fa",
             Self::Ff => "ff",
             Self::Fi => "fi",
             Self::Fj => "fj",
             Self::Fo => "fo",
             Self::Fr => "fr",
             Self::Fy => "fy",
             Self::Ga => "ga",
             Self::Gd => "gd",
             Self::Gl => "gl",
             Self::Gn => "gn",
             Self::Gu => "gu",
             Self::Gv => "gv",
             Self::Ha => "ha",
             Self::He => "he",
             Self::Hi => "hi",
             Self::Ho => "ho",
             Self::Hr => "hr",
             Self::Ht => "ht",
             Self::Hu => "hu",
             Self::Hy => "hy",
             Self::Hz => "hz",
             Self::Ia => "ia",
             Self::Id => "id",
             Self::Ie => "ie",
             Self::Ig => "ig",
             Self::Ii => "ii",
             Self::Ik => "ik",
             Self::Io => "io",
             Self::Is => "is",
             Self::It => "it",
             Self::Iu => "iu",
             Self::Ja => "ja",
             Self::Jv => "jv",
             Self::Ka => "ka",
             Self::Kg => "kg",
             Self::Ki => "ki",
             Self::Kj => "kj",
             Self::Kk => "kk",
             Self::Kl => "kl",
             Self::Km => "km",
             Self::Kn => "kn",
             Self::Ko => "ko",
             Self::Kr => "kr",
             Self::Ks => "ks",
             Self::Ku => "ku",
             Self::Kv => "kv",
             Self::Kw => "kw",
             Self::Ky => "ky",
             Self::La => "la",
             Self::Lb => "lb",
             Self::Lg => "lg",
             Self::Li => "li",
             Self::Ln => "ln",
             Self::Lo => "lo",
             Self::Lt => "lt",
             Self::Lu => "lu",
             Self::Lv => "lv",
             Self::Mg => "mg",
             Self::Mh => "mh",
             Self::Mi => "mi",
             Self::Mk => "mk",
             Self::Ml => "ml",
             Self::Mn => "mn",
             Self::Mr => "mr",
             Self::Ms => "ms",
             Self::Mt => "mt",
             Self::My => "my",
             Self::Na => "na",
             Self::Nb => "nb",
             Self::Nd => "nd",
             Self::Ne => "ne",
             Self::Ng => "ng",
             Self::Nl => "nl",
             Self::Nn => "nn",
             Self::No => "no",
             Self::Nr => "nr",
             Self::Nv => "nv",
             Self::Ny => "ny",
             Self::Oc => "oc",
             Self::Oj => "oj",
             Self::Om => "om",
             Self::Or => "or",
             Self::Os => "os",
             Self::Pa => "pa",
             Self::Pi => "pi",
             Self::Pl => "pl",
             Self::Ps => "ps",
             Self::Pt => "pt",
             Self::Qu => "qu",
             Self::Rm => "rm",
             Self::Rn => "rn",
             Self::Ro => "ro",
             Self::Ru => "ru",
             Self::Rw => "rw",
             Self::Sa => "sa",
             Self::Sc => "sc",
             Self::Sd => "sd",
             Self::Se => "se",
             Self::Sg => "sg",
             Self::Si => "si",
             Self::Sk => "sk",
             Self::Sl => "sl",
             Self::Sm => "sm",
             Self::Sn => "sn",
             Self::So => "so",
             Self::Sq => "sq",
             Self::Sr => "sr",
             Self::Ss => "ss",
             Self::St => "st",
             Self::Su => "su",
             Self::Sv => "sv",
             Self::Sw => "sw",
             Self::Ta => "ta",
             Self::Te => "te",
             Self::Tg => "tg",
             Self::Th => "th",
             Self::Ti => "ti",
             Self::Tk => "tk",
             Self::Tl => "tl",
             Self::Tn => "tn",
             Self::To => "to",
             Self::Tr => "tr",
             Self::Ts => "ts",
             Self::Tt => "tt",
             Self::Tw => "tw",
             Self::Ty => "ty",
             Self::Ug => "ug",
             Self::Uk => "uk",
             Self::Ur => "ur",
             Self::Uz => "uz",
             Self::Ve => "ve",
             Self::Vi => "vi",
             Self::Vo => "vo",
             Self::Wa => "wa",
             Self::Wo => "wo",
             Self::Xh => "xh",
             Self::Yi => "yi",
             Self::Yo => "yo",
             Self::Za => "za",
             Self::Zh => "zh",
             Self::Zu => "zu",
         }
     }

     ///
     /// Returns name, or names of this language. Where multiple names
     /// exist they are separated by `';'`.
     ///
     pub fn language_name(&self) -> &'static str {
         match self {
             Self::Aa => "Afar",
             Self::Ab => "Abkhazian",
             Self::Ae => "Avestan",
             Self::Af => "Afrikaans",
             Self::Ak => "Akan",
             Self::Am => "Amharic",
             Self::An => "Aragonese",
             Self::Ar => "Arabic",
             Self::As => "Assamese",
             Self::Av => "Avaric",
             Self::Ay => "Aymara",
             Self::Az => "Azerbaijani",
             Self::Ba => "Bashkir",
             Self::Be => "Belarusian",
             Self::Bg => "Bulgarian",
             Self::Bh => "Bihari languages",
             Self::Bi => "Bislama",
             Self::Bm => "Bambara",
             Self::Bn => "Bengali",
             Self::Bo => "Tibetan",
             Self::Br => "Breton",
             Self::Bs => "Bosnian",
             Self::Ca => "Catalan ;   Valencian",
             Self::Ce => "Chechen",
             Self::Ch => "Chamorro",
             Self::Co => "Corsican",
             Self::Cr => "Cree",
             Self::Cs => "Czech",
             Self::Cu => "Church Slavic ;   Old Slavonic ;   Church Slavonic ;   Old Bulgarian ;   Old Church Slavonic",
             Self::Cv => "Chuvash",
             Self::Cy => "Welsh",
             Self::Da => "Danish",
             Self::De => "German",
             Self::Dv => "Divehi ;   Dhivehi ;   Maldivian",
             Self::Dz => "Dzongkha",
             Self::Ee => "Ewe",
             Self::El => "Greek, Modern (1453-)",
             Self::En => "English",
             Self::Eo => "Esperanto",
             Self::Es => "Spanish ;   Castilian",
             Self::Et => "Estonian",
             Self::Eu => "Basque",
             Self::Fa => "Persian",
             Self::Ff => "Fulah",
             Self::Fi => "Finnish",
             Self::Fj => "Fijian",
             Self::Fo => "Faroese",
             Self::Fr => "French",
             Self::Fy => "Western Frisian",
             Self::Ga => "Irish",
             Self::Gd => "Gaelic ;   Scottish Gaelic",
             Self::Gl => "Galician",
             Self::Gn => "Guarani",
             Self::Gu => "Gujarati",
             Self::Gv => "Manx",
             Self::Ha => "Hausa",
             Self::He => "Hebrew",
             Self::Hi => "Hindi",
             Self::Ho => "Hiri Motu",
             Self::Hr => "Croatian",
             Self::Ht => "Haitian ;   Haitian Creole",
             Self::Hu => "Hungarian",
             Self::Hy => "Armenian",
             Self::Hz => "Herero",
             Self::Ia => "Interlingua (International Auxiliary Language Association)",
             Self::Id => "Indonesian",
             Self::Ie => "Interlingue ;   Occidental",
             Self::Ig => "Igbo",
             Self::Ii => "Sichuan Yi ;   Nuosu",
             Self::Ik => "Inupiaq",
             Self::Io => "Ido",
             Self::Is => "Icelandic",
             Self::It => "Italian",
             Self::Iu => "Inuktitut",
             Self::Ja => "Japanese",
             Self::Jv => "Javanese",
             Self::Ka => "Georgian",
             Self::Kg => "Kongo",
             Self::Ki => "Kikuyu ;   Gikuyu",
             Self::Kj => "Kuanyama ;   Kwanyama",
             Self::Kk => "Kazakh",
             Self::Kl => "Kalaallisut ;   Greenlandic",
             Self::Km => "Central Khmer",
             Self::Kn => "Kannada",
             Self::Ko => "Korean",
             Self::Kr => "Kanuri",
             Self::Ks => "Kashmiri",
             Self::Ku => "Kurdish",
             Self::Kv => "Komi",
             Self::Kw => "Cornish",
             Self::Ky => "Kirghiz ;   Kyrgyz",
             Self::La => "Latin",
             Self::Lb => "Luxembourgish ;   Letzeburgesch",
             Self::Lg => "Ganda",
             Self::Li => "Limburgan ;   Limburger ;   Limburgish",
             Self::Ln => "Lingala",
             Self::Lo => "Lao",
             Self::Lt => "Lithuanian",
             Self::Lu => "Luba-Katanga",
             Self::Lv => "Latvian",
             Self::Mg => "Malagasy",
             Self::Mh => "Marshallese",
             Self::Mi => "Maori",
             Self::Mk => "Macedonian",
             Self::Ml => "Malayalam",
             Self::Mn => "Mongolian",
             Self::Mr => "Marathi",
             Self::Ms => "Malay",
             Self::Mt => "Maltese",
             Self::My => "Burmese",
             Self::Na => "Nauru",
             Self::Nb => "Bokmål, Norwegian ;   Norwegian Bokmål",
             Self::Nd => "Ndebele, North ;   North Ndebele",
             Self::Ne => "Nepali",
             Self::Ng => "Ndonga",
             Self::Nl => "Dutch ;   Flemish",
             Self::Nn => "Norwegian Nynorsk ;   Nynorsk, Norwegian",
             Self::No => "Norwegian",
             Self::Nr => "Ndebele, South ;   South Ndebele",
             Self::Nv => "Navajo ;   Navaho",
             Self::Ny => "Chichewa ;   Chewa ;   Nyanja",
             Self::Oc => "Occitan (post 1500)",
             Self::Oj => "Ojibwa",
             Self::Om => "Oromo",
             Self::Or => "Oriya",
             Self::Os => "Ossetian ;   Ossetic",
             Self::Pa => "Panjabi ;   Punjabi",
             Self::Pi => "Pali",
             Self::Pl => "Polish",
             Self::Ps => "Pushto ;   Pashto",
             Self::Pt => "Portuguese",
             Self::Qu => "Quechua",
             Self::Rm => "Romansh",
             Self::Rn => "Rundi",
             Self::Ro => "Romanian ;   Moldavian ;   Moldovan",
             Self::Ru => "Russian",
             Self::Rw => "Kinyarwanda",
             Self::Sa => "Sanskrit",
             Self::Sc => "Sardinian",
             Self::Sd => "Sindhi",
             Self::Se => "Northern Sami",
             Self::Sg => "Sango",
             Self::Si => "Sinhala ;   Sinhalese",
             Self::Sk => "Slovak",
             Self::Sl => "Slovenian",
             Self::Sm => "Samoan",
             Self::Sn => "Shona",
             Self::So => "Somali",
             Self::Sq => "Albanian",
             Self::Sr => "Serbian",
             Self::Ss => "Swati",
             Self::St => "Sotho, Southern",
             Self::Su => "Sundanese",
             Self::Sv => "Swedish",
             Self::Sw => "Swahili",
             Self::Ta => "Tamil",
             Self::Te => "Telugu",
             Self::Tg => "Tajik",
             Self::Th => "Thai",
             Self::Ti => "Tigrinya",
             Self::Tk => "Turkmen",
             Self::Tl => "Tagalog",
             Self::Tn => "Tswana",
             Self::To => "Tonga (Tonga Islands)",
             Self::Tr => "Turkish",
             Self::Ts => "Tsonga",
             Self::Tt => "Tatar",
             Self::Tw => "Twi",
             Self::Ty => "Tahitian",
             Self::Ug => "Uighur ;   Uyghur",
             Self::Uk => "Ukrainian",
             Self::Ur => "Urdu",
             Self::Uz => "Uzbek",
             Self::Ve => "Venda",
             Self::Vi => "Vietnamese",
             Self::Vo => "Volapük",
             Self::Wa => "Walloon",
             Self::Wo => "Wolof",
             Self::Xh => "Xhosa",
             Self::Yi => "Yiddish",
             Self::Yo => "Yoruba",
             Self::Za => "Zhuang ;   Chuang",
             Self::Zh => "Chinese",
             Self::Zu => "Zulu",
         }
     }
}
