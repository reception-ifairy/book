-- ARB — blueprint postaci dla MariaDB
-- Wykonywalne DDL tworzy tabelę retellingu w wybranym schemacie.
-- Szablony INSERT i SELECT są w komentarzach blokowych. Przed użyciem
-- skopiuj je do aplikacji i powiąż placeholdery jako parametry.

-- ──────────────────────────────────────────────────────────────────────────
-- ARB · Blueprint postaci komediowej
-- ──────────────────────────────────────────────────────────────────────────

-- Jedna postać to trzy wiersze połączone wspólnym identyfikatorem. DNA ustala, kim jest bohater i jakie fakty pamięta. Persona ustala, jak mówi i reaguje. Retelling ustala, co w jego świecie może pójść absurdalnie źle i jak historia doprowadza do puenty.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Powiązanie trzech tabel
-- ──────────────────────────────────────────────────────────────────────────

-- narrative_dna  |  id = {{character_id}}  |  Pochodzenie, historia, archetyp, motywacja, relacje, rekwizyty, zasady świata
-- prompts  |  id = {{character_id}} oraz id_narrative_dna = {{character_id}}  |  Tożsamość widoczna dla odbiorcy, głos, zachowanie w scenie i konfiguracja rozmowy
-- arb_retelling_profiles  |  character_id = {{character_id}} oraz narrative_dna_id = {{character_id}}  |  Retelling, logika absurdu, gagi, scena, puenta i reakcje na wybory

-- W dostarczonym gcse.sql sprawdzono 130 par o identyfikatorach 2–131. W każdej prompts.id = prompts.id_narrative_dna = narrative_dna.id. Rekord DNA o ID 1 pełni funkcję wzorca GCSE. Każde wcielenie ma własne ID, nawet jeśli dzieli nazwę z innym wcieleniem. Połączenia wykonuj po kluczach. Slugi w prompts i narrative_dna mogą się różnić.

-- Nazwa trzeciej tabeli nawiązuje do wcześniejszego eksportu retellingów ARB. W samym gcse.sql tej tabeli nie ma. Zapis {{pole}} oznacza typowaną wartość dostarczaną przez generator, a listy i obiekty trzeba serializować jako JSON. Opcjonalny brak to SQL NULL w kolumnie lub JSON null wewnątrz dokumentu. Pusta lista [] oznacza świadomie pustą kolekcję. Jeden {{character_id}} jest używany we wszystkich trzech wierszach.

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Wiersz DNA · `narrative_dna`
-- ──────────────────────────────────────────────────────────────────────────

-- id  |  {{character_id}}  |  Wspólne ID wcielenia, np. 93 dla Baby Jagi.
-- name  |  {{character_name}}  |  Nazwa wpisu DNA, np. Baba Jaga.
-- slug  |  {{dna_slug}}  |  Unikalny slug DNA, np. istniejący art-design-baba-jaga.
-- work_title  |  {{source_title}}  |  Utwór, legenda, tradycja albo dzieło związane z postacią historyczną.
-- author_name  |  {{source_attribution}}  |  Autor, tradycja ustna lub NULL, gdy przypisanie jest nieustalone.
-- genre  |  {{genre}}  |  Gatunek tego wcielenia, np. „Baśń komediowa”, do 50 znaków.
-- narrative_structure  |  {{narrative_structure}}  |  Jedna z wartości eksportu: Linear, Non-linear, Reverse, Circular.
-- core_theme  |  {{core_theme}}  |  Zwięzły temat, który powraca mimo zmiany scenerii, do 100 znaków.
-- emotional_profile  |  {{emotional_profile_json}}  |  Mapa cech i intensywności 0–1, np. {"deadpan":0.9,"warmth":0.4,"impatience":0.6}.
-- pacing_index  |  {{pacing_index}}  |  Proponowana skala redakcyjna 0,00–1,00. Wyższa wartość oznacza krótszy czas między komplikacjami.
-- protagonist_archetype  |  {{archetype}}  |  Funkcja bohatera w historii, np. „Strażniczka progu”.
-- status  |  {{dna_status}}  |  Flaga aktywności DNA, 0 lub 1.
-- item_order  |  {{dna_item_order}}  |  Kolejność wyświetlania w katalogu DNA.
-- system_prompt  |  {{dna_system_prompt}}  |  Zwięzłe reguły ciągłości dla narratora, wygenerowane z DNA.
-- dna_json  |  {{dna_json}}  |  Rozwinięcie DNA według poniższego kontraktu.
-- created_at  |  {{dna_created_at}}  |  Czas utworzenia. Przy nowym wpisie ustawia go baza.
-- updated_at  |  {{dna_updated_at}}  |  Czas ostatniej zmiany. Ustawia go baza.

-- Pola nowego kontraktu umieść w gałęzi arb_character_v1 obiektu dna_json. Dzięki temu struktura może współistnieć z istniejącymi gałęziami GCSE.

-- source_kind  |  {{source_kind}} · tekst  |  literature, folklore, myth, historical lub original.
-- source_variant  |  {{source_variant}} · tekst  |  Konkretna wersja baśni, zakres historyczny lub wersja kanonu ARB.
-- origin_summary  |  {{origin_summary}} · tekst  |  Skąd pochodzi postać, co już przeżyła i w którym momencie zastaje ją retelling.
-- anchors  |  {{anchors}} · lista obiektów  |  Każdy wpis ma kind, detail i basis. Wpisz motywy i ich podstawę, np. tradycję ustną, utwór lub kanon ARB.
-- immutable_facts  |  {{immutable_facts}} · lista tekstów  |  Fakty lub reguły wybranego wariantu obowiązujące przez całą opowieść.
-- flexible_elements  |  {{flexible_elements}} · lista tekstów  |  Elementy, które wolno reinterpretować, np. cel wizyty, obsadę epizodu lub kontekst rekwizytu.
-- desire  |  {{desire}} · tekst  |  Czego bohater jawnie chce i po czym pozna, że to osiągnął.
-- need  |  {{need}} · tekst  |  Co mogłoby mu pomóc, choć zwykle sam tego nie dostrzega.
-- blind_spot  |  {{blind_spot}} · tekst  |  Założenie, przez które bohater regularnie wybiera rozwiązanie wywołujące kłopot.
-- stakes  |  {{stakes}} · tekst  |  Co konkretnie może utracić lub komu może utrudnić życie.
-- relationships  |  {{relationships}} · lista obiektów  |  name, role, tension. Kto pomaga, kto stawia opór i z jakiego powodu.
-- signature_objects  |  {{signature_objects}} · lista obiektów  |  name, function, limit. Rekwizyt, jego działanie i granica tego działania.
-- world_rules  |  {{world_rules}} · lista tekstów  |  Stałe prawa świata, np. chata wykonuje dosłowne polecenia przestrzenne.
-- arc_end  |  {{arc_end}} · tekst  |  Co postać na końcu uznaje, zmienia albo uparcie robi po staremu.
-- continuity_memory  |  {{continuity_memory}} · lista tekstów  |  Ustalone zdarzenia, obietnice i konsekwencje, które następna scena ma pamiętać.

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Wiersz persony · `prompts`
-- ──────────────────────────────────────────────────────────────────────────

-- id  |  {{character_id}}  |  ID tej persony.
-- id_narrative_dna  |  {{character_id}}  |  ID powiązanego DNA, zgodne z ID persony.
-- name  |  {{character_name}}  |  Nazwa widoczna w interfejsie.
-- slug  |  {{prompt_slug}}  |  Slug interfejsu. Dla istniejącego wpisu pobierz go z bazy.
-- image  |  {{avatar_path}}  |  Ścieżka do wizerunku tej wersji albo NULL.
-- status  |  {{prompt_status}}  |  Flaga aktywności persony, 0 lub 1.
-- description  |  {{character_pitch}}  |  Jedno zdanie przedstawiające postać i jej charakterystyczny problem.
-- welcome_message  |  {{welcome_line}}  |  Pierwsza kwestia w głosie postaci, rozpoczynająca zdarzenie.
-- expert  |  {{runtime_role}}  |  Rola persony, np. „Gospodyni chaty, która przesadnie dosłownie słucha poleceń”.
-- prompt  |  {{character_system_prompt}}  |  Zasady odgrywania persony, z instrukcją korzystania z DNA i retellingu.
-- display_welcome_message  |  {{show_welcome}}  |  Czy interfejs ma pokazać pierwszą kwestię.
-- API_MODEL  |  {{api_model}}  |  Model skonfigurowany w danym środowisku. Pole obowiązkowe w eksporcie.
-- interaction_style  |  {{interaction_style_json}}  |  Istniejąca konfiguracja interakcji z gałęzią arb_voice_v1.
-- response_configuration  |  {{response_configuration_json}}  |  Format i długość odpowiedzi oraz tryb podawania wyborów.
-- ai_parameters  |  {{ai_parameters_json}}  |  Parametry dostawcy, m.in. limity i losowość. Zachowaj istniejący kontrakt aplikacji.

-- point_of_view  |  {{point_of_view}} · tekst  |  Kto mówi, np. Baba Jaga w pierwszej osobie albo narrator w trzeciej.
-- register  |  {{register}} · tekst  |  Rejestr i dobór słów, np. prosty, gospodarski i ceremonialny przy drobiazgach.
-- cadence  |  {{cadence}} · tekst  |  Rytm wypowiedzi, np. krótkie rozkazy i pauza przed niedopowiedzeniem.
-- speech_signature  |  {{speech_signature}} · lista tekstów  |  Rozpoznawalne zabiegi językowe, np. rozmowa z chatą jak z kurą zaglądającą do garnka.
-- body_language  |  {{body_language}} · lista tekstów  |  Gesty, mimika i ruch rekwizytu, które same mogą zagrać żart.
-- pressure_response  |  {{pressure_response}} · tekst  |  Jak bohater reaguje, gdy jego zamiar spotyka się z oporem.
-- player_role  |  {{player_role}} · tekst  |  Kim odbiorca jest dla bohatera i jaki wpływ ma na scenę.
-- welcome_line  |  {{welcome_line}} · tekst  |  Powitanie komediowe dla trybu ARB przy współdzieleniu tabel z GCSE.
-- character_system_prompt  |  {{character_system_prompt}} · tekst  |  Instrukcja odgrywania dla trybu ARB przy współdzieleniu tabel z GCSE.
-- voice_sample  |  {{voice_sample}} · tekst  |  Krótka próbka dialogu do sprawdzenia spójności głosu.

-- Szablon {{character_system_prompt}}:

-- Wcielasz się w {{character_name}} i prowadzisz scenę z perspektywy {{point_of_view}}. Mów w rejestrze {{register}} i rytmie {{cadence}}. Kieruj się pragnieniem {{desire}}, a pod presją reaguj zgodnie z {{pressure_response}}. Trzymaj się {{immutable_facts}} oraz {{world_rules}}. Zacznij od {{inciting_incident}}. Pozwól odbiorcy działać jako {{player_role}}. Następny etap wybierz na podstawie jego działania, stanu rekwizytów i konsekwencji poprzedniej sceny. Zachowaj przygotowanie puenty i ujawnij ją dopiero po decyzji lub działaniu, które ją uruchamia. Stosuj {{humour_boundary}}.

-- ──────────────────────────────────────────────────────────────────────────
-- Pozostałe kolumny techniczne `prompts`
-- ──────────────────────────────────────────────────────────────────────────

-- Dla istniejącej postaci wartości pochodzą z jej wiersza. Przy wstawianiu nowej postaci użyj ustawień środowiska i domyślnych wartości bazy. Osobnego podania wymaga display_contacts_user_list, ponieważ eksport deklaruje to pole jako NOT NULL bez wartości domyślnej.

-- temperature  |  {{temperature}}  |  Losowość odpowiedzi, jeżeli aplikacja czyta tę kolumnę.
-- frequency_penalty  |  {{frequency_penalty}}  |  Kara częstotliwości powtórzeń, zgodnie z dostawcą.
-- presence_penalty  |  {{presence_penalty}}  |  Kara za ponowne użycie elementów już obecnych w odpowiedzi, zgodnie z dostawcą.
-- chat_minlength  |  {{chat_minlength}}  |  Dolny próg długości czatu w jednostkach używanych przez aplikację.
-- chat_maxlength  |  {{chat_maxlength}}  |  Górny próg długości czatu w jednostkach używanych przez aplikację.
-- max_num_chats_api  |  {{max_num_chats_api}}  |  Limit używany przez mechanizm wywołań czatu.
-- display_API_MODEL  |  {{display_api_model}}  |  Widoczność wyboru lub informacji o modelu.
-- use_google_voice  |  {{use_google_voice}}  |  Włączenie głosu Google.
-- use_cloud_google_voice  |  {{use_cloud_google_voice}}  |  Włączenie głosu Google Cloud.
-- display_mp3_google_cloud_text  |  {{display_mp3_google_cloud_text}}  |  Widoczność funkcji MP3 Google Cloud.
-- google_voice  |  {{google_voice}}  |  Identyfikator głosu Google.
-- google_voice_lang_code  |  {{google_voice_lang_code}}  |  Kod języka głosu Google.
-- cloud_google_voice  |  {{cloud_google_voice}}  |  Identyfikator głosu Google Cloud.
-- cloud_google_voice_lang_code  |  {{cloud_google_voice_lang_code}}  |  Kod języka głosu Google Cloud.
-- cloud_google_voice_gender  |  {{cloud_google_voice_gender}}  |  Wartość parametru głosu dostawcy.
-- display_description  |  {{display_description}}  |  Widoczność opisu persony.
-- display_mic  |  {{display_mic}}  |  Widoczność mikrofonu.
-- mic_speak_lang  |  {{mic_speak_lang}}  |  Kod języka wejścia głosowego.
-- display_avatar  |  {{display_avatar}}  |  Widoczność awatara.
-- display_copy_btn  |  {{display_copy_btn}}  |  Widoczność przycisku kopiowania.
-- filter_badwords  |  {{filter_badwords}}  |  Ustawienie filtra słownictwa.
-- display_contacts_user_list  |  {{display_contacts_user_list}}  |  Widoczność listy kontaktów, wymagana wartość 0 lub 1.
-- item_order  |  {{prompt_item_order}}  |  Kolejność persony w katalogu.
-- display_prompts_output  |  {{display_prompts_output}}  |  Widoczność ustawień formatu wyjścia.
-- display_prompts_tone  |  {{display_prompts_tone}}  |  Widoczność ustawień tonu.
-- display_prompts_writing  |  {{display_prompts_writing}}  |  Widoczność ustawień stylu pisania.
-- id_prompts_output_default  |  {{id_prompts_output_default}}  |  Identyfikator domyślnego formatu wyjścia.
-- id_prompts_tone_default  |  {{id_prompts_tone_default}}  |  Identyfikator domyślnego tonu.
-- id_prompts_writing_default  |  {{id_prompts_writing_default}}  |  Identyfikator domyślnego stylu pisania.
-- display_suggestions  |  {{display_suggestions}}  |  Widoczność sugestii.
-- suggestions  |  {{suggestions}}  |  Treść sugestii w formacie aplikacji.
-- allow_embed_chat  |  {{allow_embed_chat}}  |  Możliwość osadzenia czatu.
-- array_message_history  |  {{array_message_history}}  |  Ustawienie rozmiaru historii wiadomości.
-- array_message_limit_length  |  {{array_message_limit_length}}  |  Limit długości pozycji historii w jednostkach aplikacji.
-- display_share  |  {{display_share}}  |  Widoczność funkcji udostępniania.
-- use_dalle  |  {{use_dalle}}  |  Dostępność generowania obrazów przez DALL·E.
-- use_mic_whisper  |  {{use_mic_whisper}}  |  Dostępność rozpoznawania mowy przez Whisper.
-- use_vision  |  {{use_vision}}  |  Dostępność wejścia obrazowego.
-- ai_tone_id  |  {{ai_tone_id}}  |  Identyfikator tonu z konfiguracji aplikacji.
-- ai_style_id  |  {{ai_style_id}}  |  Identyfikator stylu z konfiguracji aplikacji.

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Wiersz retellingu · `arb_retelling_profiles`
-- ──────────────────────────────────────────────────────────────────────────

-- character_id  |  {{character_id}}  |  Klucz główny i odwołanie do prompts.id.
-- narrative_dna_id  |  {{character_id}}  |  Odwołanie do narrative_dna.id.
-- retelling_json  |  {{retelling_json}}  |  Pełny kontrakt opisany poniżej.
-- updated_at  |  {{retelling_updated_at}}  |  Znacznik czasu ustawiany przez bazę.

-- schema_version  |  {{schema_version}} · liczba całkowita  |  Wersja kontraktu, początkowo 1.
-- retelling_title  |  {{retelling_title}} · tekst  |  Tytuł odcinka obiecujący konkretny kłopot.
-- retelling_type  |  {{retelling_type}} · tekst  |  Np. alternate_scene, sequel, role_reversal, perspective_shift lub setting_transplant.
-- canon_anchor  |  {{canon_anchor}} · tekst  |  Motyw z DNA, który uruchamia scenę i pozostaje rozpoznawalny w puencie.
-- invented_change  |  {{invented_change}} · tekst  |  Fikcyjna zmiana wprowadzona przez retelling, np. chata traktuje polecenie jako zadanie ciągłe.
-- setting  |  {{setting}} · tekst  |  Miejsce, czas i jeden szczegół ważny dla inscenizacji.
-- scene_goal  |  {{scene_goal}} · tekst  |  Co bohater chce osiągnąć właśnie teraz.
-- inciting_incident  |  {{inciting_incident}} · tekst  |  Zdarzenie, po którym trzeba zadziałać.
-- humour_mechanism  |  {{humour_mechanism}} · tekst  |  Główny mechanizm, np. dosłowność, odwrócenie ról lub pomyłka tożsamości.
-- comic_contradiction  |  {{comic_contradiction}} · tekst  |  Zderzenie dwóch sensownych oczekiwań, np. gospodyni chce ułatwić wizytę, a chata za wszelką cenę skraca drogę gościa do drzwi.
-- absurd_rule  |  {{absurd_rule}} · tekst  |  Jedno niezwykłe prawo działające konsekwentnie od pierwszej próby do puenty.
-- straight_character  |  {{straight_character}} · tekst lub null  |  Kto zachowuje powagę i podkreśla absurd wyważoną reakcją.
-- setup  |  {{setup}} · tekst  |  Konkretny detal wprowadzony przed komplikacją, potrzebny później w puencie.
-- escalation  |  {{escalation}} · lista obiektów  |  Dwa lub trzy kroki. Każdy ma action, consequence i next_pressure. Kolejne kłopoty wynikają z poprzednich decyzji.
-- punchline  |  {{punchline}} · tekst  |  Najkrótsze działanie, obraz lub kwestia, która odwraca znaczenie przygotowanego szczegółu.
-- aftermath  |  {{aftermath}} · tekst  |  Co zmieniło się po puencie w świecie, relacji lub stanie rekwizytu.
-- running_gag  |  {{running_gag}} · obiekt lub null  |  trigger, first_use, variation, retire_when. Określ, kiedy żart wraca, co się w nim zmienia i kiedy przestaje działać.
-- humour_boundary  |  {{humour_boundary}} · tekst  |  Wskaż cel żartu i dopuszczalną intensywność. Domyślnie komizm bierze na cel upór, regułę albo sytuację.
-- choices  |  {{choices}} · lista obiektów  |  Opcjonalne ścieżki A/B/C. Każda ma key, action, consequence, state_change. Wpisz [] dla sceny liniowej.

-- ──────────────────────────────────────────────────────────────────────────
-- 5. SQL dla trzech wierszy
-- ──────────────────────────────────────────────────────────────────────────

-- Proponowane DDL dla nowej tabeli na schemacie z eksportu MariaDB. Jeżeli tabela istnieje po wcześniejszym imporcie ARB, najpierw porównaj jej definicję i sprawdź zgodność ID. CREATE TABLE IF NOT EXISTS nie aktualizuje istniejących ograniczeń.

CREATE TABLE IF NOT EXISTS arb_retelling_profiles (
    character_id INT NOT NULL,
    narrative_dna_id INT NOT NULL,
    retelling_json LONGTEXT COLLATE utf8mb4_bin NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (character_id),
    KEY idx_arb_retelling_dna (narrative_dna_id),
    CONSTRAINT chk_arb_retelling_same_id
        CHECK (character_id = narrative_dna_id),
    CONSTRAINT chk_arb_retelling_json
        CHECK (JSON_VALID(retelling_json)),
    CONSTRAINT fk_arb_retelling_character
        FOREIGN KEY (character_id) REFERENCES prompts (id),
    CONSTRAINT fk_arb_retelling_dna
        FOREIGN KEY (narrative_dna_id) REFERENCES narrative_dna (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Poniższy wzorzec to trzy rekordy dla nowego ID. Placeholdery są zapisem redakcyjnym. Generator powinien zamienić je na parametry przygotowanego zapytania i przekazać wartości bez ręcznego składania literałów. Operacje DML wykonuj w jednej transakcji po przygotowaniu tabeli, z wycofaniem przy błędzie któregokolwiek zapisu.

/*
START TRANSACTION;

INSERT INTO narrative_dna (
    id, name, slug, work_title, author_name, genre,
    narrative_structure, core_theme, emotional_profile, pacing_index,
    protagonist_archetype, status, item_order, system_prompt, dna_json
) VALUES (
    {{character_id}}, {{character_name}}, {{dna_slug}}, {{source_title}},
    {{source_attribution}}, {{genre}}, {{narrative_structure}}, {{core_theme}},
    {{emotional_profile_json}}, {{pacing_index}}, {{archetype}},
    {{dna_status}}, {{dna_item_order}}, {{dna_system_prompt}}, {{dna_json}}
);

INSERT INTO prompts (
    id, id_narrative_dna, name, slug, image, status, description,
    welcome_message, expert, prompt, display_welcome_message, API_MODEL,
    display_contacts_user_list, item_order, ai_parameters,
    interaction_style, response_configuration
) VALUES (
    {{character_id}}, {{character_id}}, {{character_name}}, {{prompt_slug}},
    {{avatar_path}}, {{prompt_status}}, {{character_pitch}}, {{welcome_line}},
    {{runtime_role}}, {{character_system_prompt}}, {{show_welcome}},
    {{api_model}}, {{display_contacts_user_list}}, {{prompt_item_order}},
    {{ai_parameters_json}}, {{interaction_style_json}}, {{response_configuration_json}}
);

INSERT INTO arb_retelling_profiles (
    character_id, narrative_dna_id, retelling_json
) VALUES (
    {{character_id}}, {{character_id}}, {{retelling_json}}
);

COMMIT;
*/

-- Dla istniejącego profilu najpierw potwierdź zgodność trzech identyfikatorów źródłowych. W warstwie ARB dopisz arb_character_v1 i arb_voice_v1 jako nowe gałęzie JSON, zachowując pozostałe klucze, a trzeci wiersz wstaw lub zaktualizuj po character_id. Jeżeli te same tabele obsługują GCSE, uruchamiaj komedię w osobnym trybie aplikacji, który jawnie odczyta nowe gałęzie i wiersz retellingu. Treści persony takie jak komediowe powitanie i instrukcję odgrywania trzymaj wtedy w arb_voice_v1 pod kluczami welcome_line i character_system_prompt, z tymi samymi placeholderami co w wariancie dla nowego ID. Pozwala to obu trybom korzystać ze wspólnego ID i odrębnych instrukcji. Sam import danych wymaga obsługi tych pól przez aplikację.

/*
SELECT p.id, p.name, p.prompt, p.welcome_message,
       d.dna_json, p.interaction_style, r.retelling_json
FROM prompts AS p
JOIN narrative_dna AS d
    ON d.id = p.id_narrative_dna AND d.id = p.id
JOIN arb_retelling_profiles AS r
    ON r.character_id = p.id AND r.narrative_dna_id = d.id
WHERE p.id = ?;
*/

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Przykład redakcyjny · Baba Jaga, ID 93
-- ──────────────────────────────────────────────────────────────────────────

-- DNA  |  Kotwice to leśna samotnia i chata na kurzych nogach. Baba Jaga chce przyjąć gościa z honorem i zakłada, że chata rozumie różnicę między wskazaniem kierunku a poleceniem pościgu.
-- Persona  |  Gospodarska powaga i krótkie polecenia. Kiedy chata zaczyna biec, Jaga nadal zachowuje się jak gospodyni. „Proszę wejść. Dom już po pana poszedł”.
-- Retelling  |  Chata po poleceniu obraca wejście za gościem, nawet gdy ten ucieka. Najpierw robi obrót. Następnie idzie za nim między drzewami. W końcu człowiek uchodzi do domu i puka do własnych drzwi. Jaga jest już w środku i nalewa mu herbaty.

-- Przykładowe wybory przed finałem: A zatrzymaj się i zapukaj w drzwi chaty, co kończy pościg i zmienia scenę w wizytę. B pobiegnij do domu, co uruchamia puentę z herbatą. C ustaw przy drodze kukłę, co przenosi komediowe nieporozumienie na zastępczego gościa i zostawia chatę w lesie. Każda odpowiedź zmienia pozycję chaty lub cel pościgu.

-- ──────────────────────────────────────────────────────────────────────────
-- 7. Kryteria gotowego profilu
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Kotwica DNA wiąże pochodzenie, konflikt i puentę. Po zamianie bohatera na dowolną inną postać scena przestaje działać w tej samej postaci.
-- 2. Opis pozwala wskazać, co pochodzi ze źródła, a co zostało wymyślone na potrzeby tej wersji.
-- 3. Każdy krok eskalacji wynika z decyzji bohatera albo stałej reguły świata.
-- 4. Puenta wykorzystuje szczegół przygotowany w scenie, a jej konsekwencja trafia do stanu dalszej opowieści.
-- 5. Każda aktywna opcja wpływa na zdarzenie lub stan świata. Persona pozostaje rozpoznawalna także po nieoczekiwanej decyzji odbiorcy.
-- 6. Zapis zawiera jeden wspólny ID, poprawne dokumenty JSON i trzy pasujące wiersze odczytywane wspólnym zapytaniem.
