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
/// package that describes the ISO-639-5 specification.
///
pub const ISO_639_5: Standard = Standard::new_with_long_ref(
    Agency::ISO,
    "639-5",
    "ISO 639-5:2008",
    "Codes for the representation of names of languages — Part 5: Alpha-3 code for language families and groups",
    "https://www.iso.org/standard/39536.html",
);

/// 
/// A Language Code enumeration representing the three-letter
/// 639-5 identifier.
///
/// ISO 639-5 defines alpha-3 (3-letter) codes, called "collective
/// codes", that identify language families and groups. As of the
/// February 11, 2013 update to ISO 639-5, the standard defines
/// 115 collective codes. The United States Library of Congress
/// maintains the list of Alpha-3 codes that comprise ISO 639-5.
///
/// The standard does not cover all language families used by
/// linguists. The languages covered by a group code need not be
/// linguistically related, but may have a geographic relation,
/// or category relation (such as Creoles).
/// 
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[cfg_attr(feature = "serde", derive(Deserialize, Serialize))]
pub enum LanguageCode {
    /// Austro-Asiatic languages
    Aav,
    /// Afro-Asiatic languages
    Afa,
    /// Algonquian languages
    Alg,
    /// Atlantic-Congo languages
    Alv,
    /// Apache languages
    Apa,
    /// Alacalufan languages
    Aqa,
    /// Algic languages
    Aql,
    /// Artificial languages
    Art,
    /// Athapascan languages
    Ath,
    /// Arauan languages
    Auf,
    /// Australian languages
    Aus,
    /// Arawakan languages
    Awd,
    /// Uto-Aztecan languages
    Azc,
    /// Banda languages
    Bad,
    /// Bamileke languages
    Bai,
    /// Baltic languages
    Bat,
    /// Berber languages
    Ber,
    /// Bihari languages
    Bih,
    /// Bantu languages
    Bnt,
    /// Batak languages
    Btk,
    /// Central American Indian languages
    Cai,
    /// Caucasian languages
    Cau,
    /// Chibchan languages
    Cba,
    /// North Caucasian languages
    Ccn,
    /// South Caucasian languages
    Ccs,
    /// Chadic languages
    Cdc,
    /// Caddoan languages
    Cdd,
    /// Celtic languages
    Cel,
    /// Chamic languages
    Cmc,
    /// Creoles and pidgins, English‑based
    Cpe,
    /// Creoles and pidgins, French‑based
    Cpf,
    /// Creoles and pidgins, Portuguese-based
    Cpp,
    /// Creoles and pidgins
    Crp,
    /// Central Sudanic languages
    Csu,
    /// Cushitic languages
    Cus,
    /// Land Dayak languages
    Day,
    /// Mande languages
    Dmn,
    /// Dravidian languages
    Dra,
    /// Egyptian languages
    Egx,
    /// Eskimo-Aleut languages
    Esx,
    /// Basque (family)
    Euq,
    /// Finno-Ugrian languages
    Fiu,
    /// Formosan languages
    Fox,
    /// Germanic languages
    Gem,
    /// East Germanic languages
    Gme,
    /// North Germanic languages
    Gmq,
    /// West Germanic languages
    Gmw,
    /// Greek languages
    Grk,
    /// Hmong-Mien languages
    Hmx,
    /// Hokan languages
    Hok,
    /// Armenian (family)
    Hyx,
    /// Indo-Iranian languages
    Iir,
    /// Ijo languages
    Ijo,
    /// Indic languages
    Inc,
    /// Indo-European languages
    Ine,
    /// Iranian languages
    Ira,
    /// Iroquoian languages
    Iro,
    /// Italic languages
    Itc,
    /// Japanese (family)
    Jpx,
    /// Karen languages
    Kar,
    /// Kordofanian languages
    Kdo,
    /// Khoisan languages
    Khi,
    /// Kru languages
    Kro,
    /// Austronesian languages
    Map,
    /// Mon-Khmer languages
    Mkh,
    /// Manobo languages
    Mno,
    /// Munda languages
    Mun,
    /// Mayan languages
    Myn,
    /// Nahuatl languages
    Nah,
    /// North American Indian languages
    Nai,
    /// Trans-New Guinea languages
    Ngf,
    /// Niger-Kordofanian languages
    Nic,
    /// Nubian languages
    Nub,
    /// Oto-Manguean languages
    Omq,
    /// Omotic languages
    Omv,
    /// Otomian languages
    Oto,
    /// Papuan languages
    Paa,
    /// Philippine languages
    Phi,
    /// Central Malayo-Polynesian languages
    Plf,
    /// Malayo-Polynesian languages
    Poz,
    /// Eastern Malayo-Polynesian languages
    Pqe,
    /// Western Malayo-Polynesian languages
    Pqw,
    /// Prakrit languages
    Pra,
    /// Quechuan (family)
    Qwe,
    /// Romance languages
    Roa,
    /// South American Indian languages
    Sai,
    /// Salishan languages
    Sal,
    /// Eastern Sudanic languages
    Sdv,
    /// Semitic languages
    Sem,
    /// sign languages
    Sgn,
    /// Siouan languages
    Sio,
    /// Sino-Tibetan languages
    Sit,
    /// Slavic languages
    Sla,
    /// Sami languages
    Smi,
    /// Songhai languages
    Son,
    /// Albanian languages
    Sqj,
    /// Nilo-Saharan languages
    Ssa,
    /// Samoyedic languages
    Syd,
    /// Tai languages
    Tai,
    /// Tibeto-Burman languages
    Tbq,
    /// Turkic languages
    Trk,
    /// Tupi languages
    Tup,
    /// Altaic languages
    Tut,
    /// Tungus languages
    Tuw,
    /// Uralic languages
    Urj,
    /// Wakashan languages
    Wak,
    /// Sorbian languages
    Wen,
    /// Mongolian languages
    Xgn,
    /// Na-Dene languages
    Xnd,
    /// Yupik languages
    Ypk,
    /// Chinese (family)
    Zhx,
    /// East Slavic languages
    Zle,
    /// South Slavic languages
    Zls,
    /// West Slavic languages
    Zlw,
    /// Zande languages
    Znd,
}

/// Provides an array of all defined [LanguageCode] codes, useful for queries.
pub const ALL_CODES: [LanguageCode;115] = [
    LanguageCode::Aav,
    LanguageCode::Afa,
    LanguageCode::Alg,
    LanguageCode::Alv,
    LanguageCode::Apa,
    LanguageCode::Aqa,
    LanguageCode::Aql,
    LanguageCode::Art,
    LanguageCode::Ath,
    LanguageCode::Auf,
    LanguageCode::Aus,
    LanguageCode::Awd,
    LanguageCode::Azc,
    LanguageCode::Bad,
    LanguageCode::Bai,
    LanguageCode::Bat,
    LanguageCode::Ber,
    LanguageCode::Bih,
    LanguageCode::Bnt,
    LanguageCode::Btk,
    LanguageCode::Cai,
    LanguageCode::Cau,
    LanguageCode::Cba,
    LanguageCode::Ccn,
    LanguageCode::Ccs,
    LanguageCode::Cdc,
    LanguageCode::Cdd,
    LanguageCode::Cel,
    LanguageCode::Cmc,
    LanguageCode::Cpe,
    LanguageCode::Cpf,
    LanguageCode::Cpp,
    LanguageCode::Crp,
    LanguageCode::Csu,
    LanguageCode::Cus,
    LanguageCode::Day,
    LanguageCode::Dmn,
    LanguageCode::Dra,
    LanguageCode::Egx,
    LanguageCode::Esx,
    LanguageCode::Euq,
    LanguageCode::Fiu,
    LanguageCode::Fox,
    LanguageCode::Gem,
    LanguageCode::Gme,
    LanguageCode::Gmq,
    LanguageCode::Gmw,
    LanguageCode::Grk,
    LanguageCode::Hmx,
    LanguageCode::Hok,
    LanguageCode::Hyx,
    LanguageCode::Iir,
    LanguageCode::Ijo,
    LanguageCode::Inc,
    LanguageCode::Ine,
    LanguageCode::Ira,
    LanguageCode::Iro,
    LanguageCode::Itc,
    LanguageCode::Jpx,
    LanguageCode::Kar,
    LanguageCode::Kdo,
    LanguageCode::Khi,
    LanguageCode::Kro,
    LanguageCode::Map,
    LanguageCode::Mkh,
    LanguageCode::Mno,
    LanguageCode::Mun,
    LanguageCode::Myn,
    LanguageCode::Nah,
    LanguageCode::Nai,
    LanguageCode::Ngf,
    LanguageCode::Nic,
    LanguageCode::Nub,
    LanguageCode::Omq,
    LanguageCode::Omv,
    LanguageCode::Oto,
    LanguageCode::Paa,
    LanguageCode::Phi,
    LanguageCode::Plf,
    LanguageCode::Poz,
    LanguageCode::Pqe,
    LanguageCode::Pqw,
    LanguageCode::Pra,
    LanguageCode::Qwe,
    LanguageCode::Roa,
    LanguageCode::Sai,
    LanguageCode::Sal,
    LanguageCode::Sdv,
    LanguageCode::Sem,
    LanguageCode::Sgn,
    LanguageCode::Sio,
    LanguageCode::Sit,
    LanguageCode::Sla,
    LanguageCode::Smi,
    LanguageCode::Son,
    LanguageCode::Sqj,
    LanguageCode::Ssa,
    LanguageCode::Syd,
    LanguageCode::Tai,
    LanguageCode::Tbq,
    LanguageCode::Trk,
    LanguageCode::Tup,
    LanguageCode::Tut,
    LanguageCode::Tuw,
    LanguageCode::Urj,
    LanguageCode::Wak,
    LanguageCode::Wen,
    LanguageCode::Xgn,
    LanguageCode::Xnd,
    LanguageCode::Ypk,
    LanguageCode::Zhx,
    LanguageCode::Zle,
    LanguageCode::Zls,
    LanguageCode::Zlw,
    LanguageCode::Znd,
];

// ------------------------------------------------------------------------------------------------
// Implementations
// ------------------------------------------------------------------------------------------------

impl FromStr for LanguageCode {
    type Err = LanguageCodeError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "aav" => Ok(Self::Aav),
            "afa" => Ok(Self::Afa),
            "alg" => Ok(Self::Alg),
            "alv" => Ok(Self::Alv),
            "apa" => Ok(Self::Apa),
            "aqa" => Ok(Self::Aqa),
            "aql" => Ok(Self::Aql),
            "art" => Ok(Self::Art),
            "ath" => Ok(Self::Ath),
            "auf" => Ok(Self::Auf),
            "aus" => Ok(Self::Aus),
            "awd" => Ok(Self::Awd),
            "azc" => Ok(Self::Azc),
            "bad" => Ok(Self::Bad),
            "bai" => Ok(Self::Bai),
            "bat" => Ok(Self::Bat),
            "ber" => Ok(Self::Ber),
            "bih" => Ok(Self::Bih),
            "bnt" => Ok(Self::Bnt),
            "btk" => Ok(Self::Btk),
            "cai" => Ok(Self::Cai),
            "cau" => Ok(Self::Cau),
            "cba" => Ok(Self::Cba),
            "ccn" => Ok(Self::Ccn),
            "ccs" => Ok(Self::Ccs),
            "cdc" => Ok(Self::Cdc),
            "cdd" => Ok(Self::Cdd),
            "cel" => Ok(Self::Cel),
            "cmc" => Ok(Self::Cmc),
            "cpe" => Ok(Self::Cpe),
            "cpf" => Ok(Self::Cpf),
            "cpp" => Ok(Self::Cpp),
            "crp" => Ok(Self::Crp),
            "csu" => Ok(Self::Csu),
            "cus" => Ok(Self::Cus),
            "day" => Ok(Self::Day),
            "dmn" => Ok(Self::Dmn),
            "dra" => Ok(Self::Dra),
            "egx" => Ok(Self::Egx),
            "esx" => Ok(Self::Esx),
            "euq" => Ok(Self::Euq),
            "fiu" => Ok(Self::Fiu),
            "fox" => Ok(Self::Fox),
            "gem" => Ok(Self::Gem),
            "gme" => Ok(Self::Gme),
            "gmq" => Ok(Self::Gmq),
            "gmw" => Ok(Self::Gmw),
            "grk" => Ok(Self::Grk),
            "hmx" => Ok(Self::Hmx),
            "hok" => Ok(Self::Hok),
            "hyx" => Ok(Self::Hyx),
            "iir" => Ok(Self::Iir),
            "ijo" => Ok(Self::Ijo),
            "inc" => Ok(Self::Inc),
            "ine" => Ok(Self::Ine),
            "ira" => Ok(Self::Ira),
            "iro" => Ok(Self::Iro),
            "itc" => Ok(Self::Itc),
            "jpx" => Ok(Self::Jpx),
            "kar" => Ok(Self::Kar),
            "kdo" => Ok(Self::Kdo),
            "khi" => Ok(Self::Khi),
            "kro" => Ok(Self::Kro),
            "map" => Ok(Self::Map),
            "mkh" => Ok(Self::Mkh),
            "mno" => Ok(Self::Mno),
            "mun" => Ok(Self::Mun),
            "myn" => Ok(Self::Myn),
            "nah" => Ok(Self::Nah),
            "nai" => Ok(Self::Nai),
            "ngf" => Ok(Self::Ngf),
            "nic" => Ok(Self::Nic),
            "nub" => Ok(Self::Nub),
            "omq" => Ok(Self::Omq),
            "omv" => Ok(Self::Omv),
            "oto" => Ok(Self::Oto),
            "paa" => Ok(Self::Paa),
            "phi" => Ok(Self::Phi),
            "plf" => Ok(Self::Plf),
            "poz" => Ok(Self::Poz),
            "pqe" => Ok(Self::Pqe),
            "pqw" => Ok(Self::Pqw),
            "pra" => Ok(Self::Pra),
            "qwe" => Ok(Self::Qwe),
            "roa" => Ok(Self::Roa),
            "sai" => Ok(Self::Sai),
            "sal" => Ok(Self::Sal),
            "sdv" => Ok(Self::Sdv),
            "sem" => Ok(Self::Sem),
            "sgn" => Ok(Self::Sgn),
            "sio" => Ok(Self::Sio),
            "sit" => Ok(Self::Sit),
            "sla" => Ok(Self::Sla),
            "smi" => Ok(Self::Smi),
            "son" => Ok(Self::Son),
            "sqj" => Ok(Self::Sqj),
            "ssa" => Ok(Self::Ssa),
            "syd" => Ok(Self::Syd),
            "tai" => Ok(Self::Tai),
            "tbq" => Ok(Self::Tbq),
            "trk" => Ok(Self::Trk),
            "tup" => Ok(Self::Tup),
            "tut" => Ok(Self::Tut),
            "tuw" => Ok(Self::Tuw),
            "urj" => Ok(Self::Urj),
            "wak" => Ok(Self::Wak),
            "wen" => Ok(Self::Wen),
            "xgn" => Ok(Self::Xgn),
            "xnd" => Ok(Self::Xnd),
            "ypk" => Ok(Self::Ypk),
            "zhx" => Ok(Self::Zhx),
            "zle" => Ok(Self::Zle),
            "zls" => Ok(Self::Zls),
            "zlw" => Ok(Self::Zlw),
            "znd" => Ok(Self::Znd),
            _ => Err(error::unknown_value("LanguageCode", s)),
        }
    }
}

code_impl!(LanguageCode);

fixed_length_code!(LanguageCode, 3);

standardized_type!(LanguageCode, ISO_639_5);

impl LanguageCode {
     ///
     /// Returns the ISO 639-5 three-letter code a string.
     ///
     pub fn code(&self) -> &'static str {
         match self {
             Self::Aav => "aav",
             Self::Afa => "afa",
             Self::Alg => "alg",
             Self::Alv => "alv",
             Self::Apa => "apa",
             Self::Aqa => "aqa",
             Self::Aql => "aql",
             Self::Art => "art",
             Self::Ath => "ath",
             Self::Auf => "auf",
             Self::Aus => "aus",
             Self::Awd => "awd",
             Self::Azc => "azc",
             Self::Bad => "bad",
             Self::Bai => "bai",
             Self::Bat => "bat",
             Self::Ber => "ber",
             Self::Bih => "bih",
             Self::Bnt => "bnt",
             Self::Btk => "btk",
             Self::Cai => "cai",
             Self::Cau => "cau",
             Self::Cba => "cba",
             Self::Ccn => "ccn",
             Self::Ccs => "ccs",
             Self::Cdc => "cdc",
             Self::Cdd => "cdd",
             Self::Cel => "cel",
             Self::Cmc => "cmc",
             Self::Cpe => "cpe",
             Self::Cpf => "cpf",
             Self::Cpp => "cpp",
             Self::Crp => "crp",
             Self::Csu => "csu",
             Self::Cus => "cus",
             Self::Day => "day",
             Self::Dmn => "dmn",
             Self::Dra => "dra",
             Self::Egx => "egx",
             Self::Esx => "esx",
             Self::Euq => "euq",
             Self::Fiu => "fiu",
             Self::Fox => "fox",
             Self::Gem => "gem",
             Self::Gme => "gme",
             Self::Gmq => "gmq",
             Self::Gmw => "gmw",
             Self::Grk => "grk",
             Self::Hmx => "hmx",
             Self::Hok => "hok",
             Self::Hyx => "hyx",
             Self::Iir => "iir",
             Self::Ijo => "ijo",
             Self::Inc => "inc",
             Self::Ine => "ine",
             Self::Ira => "ira",
             Self::Iro => "iro",
             Self::Itc => "itc",
             Self::Jpx => "jpx",
             Self::Kar => "kar",
             Self::Kdo => "kdo",
             Self::Khi => "khi",
             Self::Kro => "kro",
             Self::Map => "map",
             Self::Mkh => "mkh",
             Self::Mno => "mno",
             Self::Mun => "mun",
             Self::Myn => "myn",
             Self::Nah => "nah",
             Self::Nai => "nai",
             Self::Ngf => "ngf",
             Self::Nic => "nic",
             Self::Nub => "nub",
             Self::Omq => "omq",
             Self::Omv => "omv",
             Self::Oto => "oto",
             Self::Paa => "paa",
             Self::Phi => "phi",
             Self::Plf => "plf",
             Self::Poz => "poz",
             Self::Pqe => "pqe",
             Self::Pqw => "pqw",
             Self::Pra => "pra",
             Self::Qwe => "qwe",
             Self::Roa => "roa",
             Self::Sai => "sai",
             Self::Sal => "sal",
             Self::Sdv => "sdv",
             Self::Sem => "sem",
             Self::Sgn => "sgn",
             Self::Sio => "sio",
             Self::Sit => "sit",
             Self::Sla => "sla",
             Self::Smi => "smi",
             Self::Son => "son",
             Self::Sqj => "sqj",
             Self::Ssa => "ssa",
             Self::Syd => "syd",
             Self::Tai => "tai",
             Self::Tbq => "tbq",
             Self::Trk => "trk",
             Self::Tup => "tup",
             Self::Tut => "tut",
             Self::Tuw => "tuw",
             Self::Urj => "urj",
             Self::Wak => "wak",
             Self::Wen => "wen",
             Self::Xgn => "xgn",
             Self::Xnd => "xnd",
             Self::Ypk => "ypk",
             Self::Zhx => "zhx",
             Self::Zle => "zle",
             Self::Zls => "zls",
             Self::Zlw => "zlw",
             Self::Znd => "znd",
         }
     }

     ///
     /// Returns the name of this language family or group.
     ///
     pub fn family_or_group_name(&self) -> &'static str {
         match self {
             Self::Aav => "Austro-Asiatic languages",
             Self::Afa => "Afro-Asiatic languages",
             Self::Alg => "Algonquian languages",
             Self::Alv => "Atlantic-Congo languages",
             Self::Apa => "Apache languages",
             Self::Aqa => "Alacalufan languages",
             Self::Aql => "Algic languages",
             Self::Art => "Artificial languages",
             Self::Ath => "Athapascan languages",
             Self::Auf => "Arauan languages",
             Self::Aus => "Australian languages",
             Self::Awd => "Arawakan languages",
             Self::Azc => "Uto-Aztecan languages",
             Self::Bad => "Banda languages",
             Self::Bai => "Bamileke languages",
             Self::Bat => "Baltic languages",
             Self::Ber => "Berber languages",
             Self::Bih => "Bihari languages",
             Self::Bnt => "Bantu languages",
             Self::Btk => "Batak languages",
             Self::Cai => "Central American Indian languages",
             Self::Cau => "Caucasian languages",
             Self::Cba => "Chibchan languages",
             Self::Ccn => "North Caucasian languages",
             Self::Ccs => "South Caucasian languages",
             Self::Cdc => "Chadic languages",
             Self::Cdd => "Caddoan languages",
             Self::Cel => "Celtic languages",
             Self::Cmc => "Chamic languages",
             Self::Cpe => "Creoles and pidgins, English‑based",
             Self::Cpf => "Creoles and pidgins, French‑based",
             Self::Cpp => "Creoles and pidgins, Portuguese-based",
             Self::Crp => "Creoles and pidgins",
             Self::Csu => "Central Sudanic languages",
             Self::Cus => "Cushitic languages",
             Self::Day => "Land Dayak languages",
             Self::Dmn => "Mande languages",
             Self::Dra => "Dravidian languages",
             Self::Egx => "Egyptian languages",
             Self::Esx => "Eskimo-Aleut languages",
             Self::Euq => "Basque (family)",
             Self::Fiu => "Finno-Ugrian languages",
             Self::Fox => "Formosan languages",
             Self::Gem => "Germanic languages",
             Self::Gme => "East Germanic languages",
             Self::Gmq => "North Germanic languages",
             Self::Gmw => "West Germanic languages",
             Self::Grk => "Greek languages",
             Self::Hmx => "Hmong-Mien languages",
             Self::Hok => "Hokan languages",
             Self::Hyx => "Armenian (family)",
             Self::Iir => "Indo-Iranian languages",
             Self::Ijo => "Ijo languages",
             Self::Inc => "Indic languages",
             Self::Ine => "Indo-European languages",
             Self::Ira => "Iranian languages",
             Self::Iro => "Iroquoian languages",
             Self::Itc => "Italic languages",
             Self::Jpx => "Japanese (family)",
             Self::Kar => "Karen languages",
             Self::Kdo => "Kordofanian languages",
             Self::Khi => "Khoisan languages",
             Self::Kro => "Kru languages",
             Self::Map => "Austronesian languages",
             Self::Mkh => "Mon-Khmer languages",
             Self::Mno => "Manobo languages",
             Self::Mun => "Munda languages",
             Self::Myn => "Mayan languages",
             Self::Nah => "Nahuatl languages",
             Self::Nai => "North American Indian languages",
             Self::Ngf => "Trans-New Guinea languages",
             Self::Nic => "Niger-Kordofanian languages",
             Self::Nub => "Nubian languages",
             Self::Omq => "Oto-Manguean languages",
             Self::Omv => "Omotic languages",
             Self::Oto => "Otomian languages",
             Self::Paa => "Papuan languages",
             Self::Phi => "Philippine languages",
             Self::Plf => "Central Malayo-Polynesian languages",
             Self::Poz => "Malayo-Polynesian languages",
             Self::Pqe => "Eastern Malayo-Polynesian languages",
             Self::Pqw => "Western Malayo-Polynesian languages",
             Self::Pra => "Prakrit languages",
             Self::Qwe => "Quechuan (family)",
             Self::Roa => "Romance languages",
             Self::Sai => "South American Indian languages",
             Self::Sal => "Salishan languages",
             Self::Sdv => "Eastern Sudanic languages",
             Self::Sem => "Semitic languages",
             Self::Sgn => "sign languages",
             Self::Sio => "Siouan languages",
             Self::Sit => "Sino-Tibetan languages",
             Self::Sla => "Slavic languages",
             Self::Smi => "Sami languages",
             Self::Son => "Songhai languages",
             Self::Sqj => "Albanian languages",
             Self::Ssa => "Nilo-Saharan languages",
             Self::Syd => "Samoyedic languages",
             Self::Tai => "Tai languages",
             Self::Tbq => "Tibeto-Burman languages",
             Self::Trk => "Turkic languages",
             Self::Tup => "Tupi languages",
             Self::Tut => "Altaic languages",
             Self::Tuw => "Tungus languages",
             Self::Urj => "Uralic languages",
             Self::Wak => "Wakashan languages",
             Self::Wen => "Sorbian languages",
             Self::Xgn => "Mongolian languages",
             Self::Xnd => "Na-Dene languages",
             Self::Ypk => "Yupik languages",
             Self::Zhx => "Chinese (family)",
             Self::Zle => "East Slavic languages",
             Self::Zls => "South Slavic languages",
             Self::Zlw => "West Slavic languages",
             Self::Znd => "Zande languages",
         }
     }
}
