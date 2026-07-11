import ASSETS from '../assets.js';
import RoomClient from '../network/RoomClient.js';

const ROOM_CODE_DISPLAY_MS = 2000;
const ACTIVE_ROOM_POLL_MS = 2000;
const ACTIVE_ROOM_ROW_LIMIT = 4;
const IS_DEVELOPMENT_BUILD = import.meta.env.DEV;
const DEV_GAME_MAP_OPTIONS = ['lvlone', 'DEFAULT'];
const OUTFIT_TINTS = [0x7954b8, 0x2477a6, 0xba4343, 0x3fcd46, null];
const CHARACTER_NAME_MAX_LENGTH = 12;
const MAX_CHARACTER_COUNT = 5;
const CHARACTER_LIST_RETRY_DELAYS_MS = [150, 350, 700];
const LOBBY_BACKGROUND_DEPTH = -10;
const LOBBY_UI_DEPTH = 10;

export class Lobby extends Phaser.Scene {
    constructor() {
        super('Lobby');
    }

    create() {
        this._state = 'idle';
        this._screen = 'main';
        this._characters = [];
        this._selectedCharacterIndex = 0;
        this._newCharacterNameDraft = '';
        this._confirmingDelete = false;
        this._activeRoomRows = [];
        this._activeRoomsRequestId = 0;
        this._isRefreshingActiveRooms = false;
        this._activeRoomsPoll = null;
        this._ui = [];
        this._loadCharactersRequestId = 0;
        this._keyHandler = (event) => this._onKey(event);
        RoomClient.refreshSelectedCharacterId();

        this._showMainMenu();
        this.input.keyboard.on('keydown', this._keyHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this._loadCharactersRequestId++;
            this._activeRoomsRequestId++;
            this._activeRoomsPoll?.remove(false);
            this._activeRoomsPoll = null;
            if (this._keyHandler) this.input.keyboard.off('keydown', this._keyHandler);
            this._keyHandler = null;
        });
    }

    _onKey(event) {
        if (this._state !== 'idle') return;
        if (this._confirmingDelete) {
            const key = String(event.key || '').toUpperCase();
            if (key === 'Y') void this._confirmDeleteCharacter();
            if (key === 'N' || key === 'ESCAPE') this._cancelDeleteCharacter();
            return;
        }
        if (this._screen === 'submenu' && !this._selectedCharacter()) {
            if (this._onNewCharacterNameKey(event)) return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            if (this._screen === 'main') {
                this._showSubMenu();
            } else {
                void this._onCreateRoom();
            }
        } else if (this._screen === 'submenu' && event.key === 'ArrowLeft') {
            this._selectPreviousCharacter();
        } else if (this._screen === 'submenu' && event.key === 'ArrowRight') {
            this._selectNextCharacter();
        }
    }

    _clearMenu() {
        this._loadCharactersRequestId++;
        this._activeRoomsPoll?.remove(false);
        this._activeRoomsPoll = null;
        this._activeRoomRows.forEach((row) => row.destroy());
        this._activeRoomRows = [];
        this._ui.forEach((item) => item?.destroy());
        this._ui = [];
        this._isRefreshingActiveRooms = false;
        this._activeRoomsPanel = null;
        this._activeRoomsStatusText = null;
        this._createBtn = null;
        this._statusText = null;
        this._serverBtn = null;
        this._characterNameText = null;
        this._characterLevelText = null;
        this._characterSprite = null;
        this._nameBox = null;
        this._nameBoxText = null;
        this._deleteButton = null;
        this._deleteConfirmText = null;
        this._deleteYesButton = null;
        this._deleteNoButton = null;
        this._leftArrow = null;
        this._rightArrow = null;
    }

    _add(item) {
        item?.setDepth?.(LOBBY_UI_DEPTH);
        this._ui.push(item);
        return item;
    }

    _addBackground(assetKey) {
        return this._add(this.add.image(this.scale.width * 0.5, this.scale.height * 0.5, assetKey)
            .setDisplaySize(this.scale.width, this.scale.height)
            .setDepth(LOBBY_BACKGROUND_DEPTH));
    }

    _showMainMenu() {
        this._clearMenu();
        this._screen = 'main';
        this._state = 'idle';
        this._addBackground(ASSETS.image.shmup2MainMenu.key);

        const start = this._add(this.add.text(this.scale.width * 0.5, this.scale.height * 0.58, 'START', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.07),
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        start.on('pointerover', () => start.setColor('#fff4bc'));
        start.on('pointerout', () => start.setColor('#ffffff'));
        start.on('pointerdown', () => this._showSubMenu());
    }

    async _showSubMenu() {
        if (this._state !== 'idle') return;
        this._clearMenu();
        this._screen = 'submenu';
        this._state = 'busy';
        this._addBackground(ASSETS.image.shmup2SubMenu.key);

        this._createCharacterPanel();
        this._createRoomButton();
        this._createServerDisplay();
        this._createActiveRoomsSidebar();
        this._setStatus('Loading characters...', '#ffffff');

        await this._loadCharacters();
        this._state = 'idle';
        this._refreshActiveRooms(true);
        this._activeRoomsPoll = this.time.addEvent({
            delay: ACTIVE_ROOM_POLL_MS,
            loop: true,
            callback: () => this._refreshActiveRooms(),
        });
    }

    _createCharacterPanel() {
        const leftX = this.scale.width * 0.31;
        this._characterNameText = this._add(this.add.text(leftX, this.scale.height * 0.20, '', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.07),
            color: '#fff4bc',
            stroke: '#000000',
            strokeThickness: 7,
            align: 'center',
        }).setOrigin(0.5));
        this._characterLevelText = this._add(this.add.text(leftX, this.scale.height * 0.31, '', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.05),
            color: '#fff4bc',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5));
        this._characterSprite = this._add(this.add.sprite(leftX, this.scale.height * 0.56, ASSETS.spritesheet.playerIdle.key, 0)
            .setDisplaySize(this.scale.height * 0.30, this.scale.height * 0.30));
        this._nameBox = this._add(this.add.rectangle(leftX, this.scale.height * 0.70, this.scale.width * 0.27, this.scale.height * 0.07, 0x000000, 0.86)
            .setStrokeStyle(3, 0xffffff, 1)
            .setInteractive({ useHandCursor: true }));
        this._nameBoxText = this._add(this.add.text(leftX, this.scale.height * 0.70, '', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.032),
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            fixedWidth: this.scale.width * 0.25,
        }).setOrigin(0.5));
        this._nameBox.on('pointerdown', () => this._setStatus('Type a character name', '#ffffff'));
        this._deleteButton = this._add(this.add.text(this.scale.width * 0.15, this.scale.height * 0.69, 'delete', {
            fontFamily: 'Arial',
            fontSize: Math.round(this.scale.height * 0.032),
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        this._deleteButton.on('pointerover', () => this._deleteButton.setColor('#ffb4a8'));
        this._deleteButton.on('pointerout', () => this._deleteButton.setColor('#ffffff'));
        this._deleteButton.on('pointerdown', () => this._beginDeleteCharacter());

        this._deleteConfirmText = this._add(this.add.text(leftX, this.scale.height * 0.69, 'DELETE?', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.032),
            color: '#ffb4a8',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5));
        this._deleteYesButton = this._add(this.add.text(leftX - this.scale.width * 0.055, this.scale.height * 0.74, 'YES', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.030),
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        this._deleteNoButton = this._add(this.add.text(leftX + this.scale.width * 0.055, this.scale.height * 0.74, 'NO', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.030),
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        this._deleteYesButton.on('pointerover', () => this._deleteYesButton.setColor('#ffb4a8'));
        this._deleteYesButton.on('pointerout', () => this._deleteYesButton.setColor('#ffffff'));
        this._deleteYesButton.on('pointerdown', () => this._confirmDeleteCharacter());
        this._deleteNoButton.on('pointerover', () => this._deleteNoButton.setColor('#fff4bc'));
        this._deleteNoButton.on('pointerout', () => this._deleteNoButton.setColor('#ffffff'));
        this._deleteNoButton.on('pointerdown', () => this._cancelDeleteCharacter());

        this._leftArrow = this._add(this.add.text(this.scale.width * 0.08, this.scale.height * 0.23, '<', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.11),
            color: '#fff4bc',
            stroke: '#000000',
            strokeThickness: 7,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        this._rightArrow = this._add(this.add.text(this.scale.width * 0.55, this.scale.height * 0.23, '>', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.11),
            color: '#fff4bc',
            stroke: '#000000',
            strokeThickness: 7,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        this._leftArrow.on('pointerdown', () => this._selectPreviousCharacter());
        this._rightArrow.on('pointerdown', () => this._selectNextCharacter());

        this._renderSelectedCharacter();
    }

    _createRoomButton() {
        const button = this._add(this.add.text(this.scale.width * 0.48, this.scale.height * 0.82, 'CREATE ROOM', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.052),
            color: '#777777',
            stroke: '#000000',
            strokeThickness: 7,
            align: 'center',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        button.on('pointerover', () => {
            if (this._canCreateRoom()) button.setColor('#fff4bc');
        });
        button.on('pointerout', () => this._updateCreateRoomButtonState());
        button.on('pointerdown', () => this._onCreateRoom());
        this._createBtn = button;

        this._statusText = this._add(this.add.text(this.scale.width * 0.48, this.scale.height * 0.91, '', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.028),
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center',
            wordWrap: { width: this.scale.width * 0.48 },
        }).setOrigin(0.5));
    }

    _createServerDisplay() {
        const serverOptions = RoomClient.getServerOptions();
        const serverBtn = this._add(this.add.text(this.scale.width * 0.48, this.scale.height * 0.10, '', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.033),
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        serverBtn.on('pointerdown', () => {
            if (this._state !== 'idle') return;
            if (serverOptions.length <= 1) return;
            RoomClient.selectNextServer();
            this._updateServerDisplay();
            this._refreshActiveRooms(true);
            void this._loadCharacters();
        });
        this._serverBtn = serverBtn;
        this._updateServerDisplay();
    }

    _updateServerDisplay() {
        this._serverBtn?.setText(`SERVER: ${RoomClient.getSelectedServer().label}`);
    }

    async _listCharactersWithReturnRetry() {
        let characters = await RoomClient.listCharacters();
        const expectedCharacterId = RoomClient.selectedCharacterId;
        if (characters.length > 0 || !expectedCharacterId) return characters;

        for (const delayMs of CHARACTER_LIST_RETRY_DELAYS_MS) {
            await new Promise((resolve) => window.setTimeout(resolve, delayMs));
            characters = await RoomClient.listCharacters();
            if (characters.length > 0 || !this.scene.isActive('Lobby')) break;
        }
        return characters;
    }

    async _loadCharacters() {
        const requestId = ++this._loadCharactersRequestId;
        try {
            this._characters = await this._listCharactersWithReturnRetry();
            if (requestId !== this._loadCharactersRequestId || !this.scene.isActive('Lobby')) return;
            if (this._characters.length === 0 && RoomClient.selectedCharacterId) {
                const cachedCharacters = RoomClient.getCachedCharacters();
                if (cachedCharacters.some((character) => character?.id === RoomClient.selectedCharacterId)) {
                    this._characters = cachedCharacters;
                }
            }
            const selectedId = RoomClient.selectedCharacterId;
            const selectedIndex = this._characters.findIndex((character) => character.id === selectedId);
            this._selectedCharacterIndex = selectedIndex >= 0 ? selectedIndex : 0;
            if (this._characters[this._selectedCharacterIndex]) {
                RoomClient.selectCharacter(this._characters[this._selectedCharacterIndex].id);
            } else {
                RoomClient.selectCharacter('');
            }
            this._confirmingDelete = false;
            this._renderSelectedCharacter();
            this._setStatus('', '#ffffff');
        } catch (error) {
            if (requestId !== this._loadCharactersRequestId || !this.scene.isActive('Lobby')) return;
            const cachedCharacters = RoomClient.getCachedCharacters();
            this._characters = cachedCharacters;
            const selectedId = RoomClient.selectedCharacterId;
            const selectedIndex = this._characters.findIndex((character) => character.id === selectedId);
            this._selectedCharacterIndex = selectedIndex >= 0 ? selectedIndex : 0;
            if (this._characters[this._selectedCharacterIndex]) {
                RoomClient.selectCharacter(this._characters[this._selectedCharacterIndex].id);
            }
            this._renderSelectedCharacter();
            this._setStatus(this._characters.length > 0 ? '' : (error?.message || 'Character list unavailable'), '#ffb4a8');
        }
    }

    _carouselSize() {
        if (this._characters.length >= MAX_CHARACTER_COUNT) return this._characters.length;
        return this._characters.length > 0 ? this._characters.length + 1 : 1;
    }

    _selectedCharacter() {
        return this._characters[this._selectedCharacterIndex] || null;
    }

    _normalizeCharacterName(value) {
        return String(value || '')
            .toUpperCase()
            .replace(/[^A-Z ]/g, '')
            .replace(/ +/g, ' ')
            .trimStart()
            .slice(0, CHARACTER_NAME_MAX_LENGTH);
    }

    _committedNewCharacterName() {
        return this._normalizeCharacterName(this._newCharacterNameDraft).trim();
    }

    _onNewCharacterNameKey(event) {
        const key = event.key;
        if (/^[a-zA-Z]$/.test(key) && this._newCharacterNameDraft.length < CHARACTER_NAME_MAX_LENGTH) {
            this._newCharacterNameDraft = this._normalizeCharacterName(`${this._newCharacterNameDraft}${key}`);
        } else if (key === ' ' && this._newCharacterNameDraft.trim().length > 0 && !this._newCharacterNameDraft.endsWith(' ') && this._newCharacterNameDraft.length < CHARACTER_NAME_MAX_LENGTH) {
            this._newCharacterNameDraft = this._normalizeCharacterName(`${this._newCharacterNameDraft} `);
        } else if (key === 'Backspace') {
            this._newCharacterNameDraft = this._newCharacterNameDraft.slice(0, -1);
        } else if (key === 'Escape') {
            this._newCharacterNameDraft = '';
        } else if (key !== 'Enter') {
            return false;
        }

        this._renderSelectedCharacter();
        return key !== 'Enter';
    }

    _selectPreviousCharacter() {
        if (this._state !== 'idle') return;
        if (this._characters.length <= 0) return;
        this._selectedCharacterIndex = (this._selectedCharacterIndex - 1 + this._carouselSize()) % this._carouselSize();
        this._syncSelectedCharacter();
    }

    _selectNextCharacter() {
        if (this._state !== 'idle') return;
        if (this._characters.length <= 0) return;
        this._selectedCharacterIndex = (this._selectedCharacterIndex + 1) % this._carouselSize();
        this._syncSelectedCharacter();
    }

    _syncSelectedCharacter() {
        const character = this._selectedCharacter();
        RoomClient.selectCharacter(character?.id || '');
        this._confirmingDelete = false;
        this._renderSelectedCharacter();
        this._setStatus('', '#ffffff');
    }

    _renderSelectedCharacter() {
        if (!this._characterNameText || !this._characterLevelText || !this._characterSprite) return;
        const character = this._selectedCharacter();
        const isNewCharacter = !character;
        this._characterNameText.setText(isNewCharacter ? 'NEW CHARACTER' : character.displayName || 'PLAYER');
        this._characterLevelText.setText(isNewCharacter ? '' : `LEVEL ${Math.max(1, character.level || 1)}`);
        this._leftArrow?.setVisible(this._characters.length > 0);
        this._rightArrow?.setVisible(this._characters.length > 0);
        this._nameBox?.setVisible(isNewCharacter);
        this._nameBoxText?.setVisible(isNewCharacter);
        this._deleteButton?.setVisible(!isNewCharacter && !this._confirmingDelete);
        this._deleteConfirmText?.setVisible(!isNewCharacter && this._confirmingDelete);
        this._deleteYesButton?.setVisible(!isNewCharacter && this._confirmingDelete);
        this._deleteNoButton?.setVisible(!isNewCharacter && this._confirmingDelete);
        if (isNewCharacter && this._nameBoxText) {
            this._nameBoxText.setText(this._newCharacterNameDraft || '');
        }

        const tint = isNewCharacter ? null : OUTFIT_TINTS[character.outfitColor || 0];
        if (tint == null) {
            this._characterSprite.clearTint();
        } else {
            this._characterSprite.setTint(tint);
        }
        this._characterSprite.setAlpha(isNewCharacter ? 0.55 : 1);
        this._updateCreateRoomButtonState();
    }

    _beginDeleteCharacter() {
        if (this._state !== 'idle') return;
        if (!this._selectedCharacter()) return;
        this._confirmingDelete = true;
        this._setStatus('', '#ffffff');
        this._renderSelectedCharacter();
    }

    _cancelDeleteCharacter() {
        this._confirmingDelete = false;
        this._renderSelectedCharacter();
    }

    async _confirmDeleteCharacter() {
        if (this._state !== 'idle') return;
        const character = this._selectedCharacter();
        if (!character) return;

        this._state = 'busy';
        this._setStatus('Deleting character...', '#ffffff');
        try {
            await RoomClient.deleteCharacter(character.id);
            this._characters = await RoomClient.listCharacters();
            this._selectedCharacterIndex = Math.min(this._selectedCharacterIndex, Math.max(0, this._characters.length - 1));
            const nextCharacter = this._selectedCharacter();
            RoomClient.selectCharacter(nextCharacter?.id || '');
            this._confirmingDelete = false;
            this._state = 'idle';
            this._renderSelectedCharacter();
            this._setStatus('', '#ffffff');
        } catch (error) {
            this._state = 'idle';
            this._confirmingDelete = false;
            this._renderSelectedCharacter();
            this._setStatus(error?.message || 'Failed to delete character.', '#ffb4a8');
        }
    }

    _canCreateRoom() {
        return !this._confirmingDelete && (!!this._selectedCharacter() || this._committedNewCharacterName().length > 0);
    }

    _updateCreateRoomButtonState() {
        if (!this._createBtn) return;
        this._createBtn.setColor(this._canCreateRoom() ? '#ffffff' : '#777777');
    }

    async _ensureSelectedCharacter() {
        const existing = this._selectedCharacter();
        if (existing) {
            RoomClient.selectCharacter(existing.id);
            return existing;
        }

        this._setStatus('Creating character...', '#ffffff');
        const name = this._committedNewCharacterName();
        if (!name) throw new Error('Enter a character name first.');
        const character = await RoomClient.createCharacter(name);
        this._characters = await RoomClient.listCharacters();
        const createdIndex = this._characters.findIndex((item) => item.id === character.id);
        this._selectedCharacterIndex = createdIndex >= 0 ? createdIndex : 0;
        this._newCharacterNameDraft = '';
        this._renderSelectedCharacter();
        return character;
    }

    _selectedGameMapName() {
        return DEV_GAME_MAP_OPTIONS[0] || 'DEFAULT';
    }

    async _onCreateRoom() {
        if (this._state !== 'idle') return;
        if (!this._canCreateRoom()) {
            this._setStatus(this._characters.length >= MAX_CHARACTER_COUNT ? 'Delete a character to make a new one.' : 'Enter a character name first.', '#ffb4a8');
            return;
        }
        this._state = 'busy';
        this._setStatus('Creating room...', '#ffffff');

        try {
            await this._ensureSelectedCharacter();
            const options = {};
            if (IS_DEVELOPMENT_BUILD) {
                const selectedMap = this._selectedGameMapName();
                if (selectedMap !== 'DEFAULT') options.mapName = selectedMap;
            }
            await RoomClient.createRoom(options);
            const code = RoomClient.room.id;
            this._setStatus(`Room created: ${code}`, '#fff4bc');
            this.time.delayedCall(ROOM_CODE_DISPLAY_MS, () => this.scene.start('Game'));
        } catch (error) {
            this._setStatus(error?.message || 'Failed to create room. Is the server running?', '#ffb4a8');
            this._state = 'idle';
            this._updateCreateRoomButtonState();
            this._refreshActiveRooms(true);
        }
    }

    async _onJoinListedRoom(roomId) {
        if (this._state !== 'idle') return;
        if (!this._canCreateRoom()) {
            this._setStatus(this._characters.length >= MAX_CHARACTER_COUNT ? 'Delete a character to make a new one.' : 'Enter a character name first.', '#ffb4a8');
            return;
        }
        this._state = 'busy';
        this._setStatus(`Joining room ${roomId}...`, '#ffffff');

        try {
            await this._ensureSelectedCharacter();
            await RoomClient.joinRoom(roomId);
            this.scene.start('Game');
        } catch (_error) {
            this._setStatus(`Room "${roomId}" is no longer available.`, '#ffb4a8');
            this._state = 'idle';
            this._updateCreateRoomButtonState();
            this._refreshActiveRooms(true);
        }
    }

    _createActiveRoomsSidebar() {
        const width = Math.round(this.scale.width * 0.29);
        const x = this.scale.width * 0.63;
        const y = this.scale.height * 0.20;
        this._activeRoomsPanel = this._add(this.add.container(x, y));
        this._activeRoomsPanel.add(this.add.text(width * 0.5, 0, 'ACTIVE ROOMS', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.04),
            color: '#fff4bc',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5, 0));
        this._activeRoomsStatusText = this.add.text(0, this.scale.height * 0.09, 'Loading...', {
            fontFamily: 'Arial Black',
            fontSize: Math.round(this.scale.height * 0.025),
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            wordWrap: { width },
            align: 'center',
        }).setOrigin(0, 0);
        this._activeRoomsPanel.add(this._activeRoomsStatusText);
    }

    async _refreshActiveRooms(force = false) {
        if (this._screen !== 'submenu') return;
        if (this._isRefreshingActiveRooms && !force) return;
        if (!this.scene.isActive('Lobby')) return;

        const requestId = ++this._activeRoomsRequestId;
        this._isRefreshingActiveRooms = true;
        if (force) this._renderActiveRooms([], 'Loading...');

        try {
            const rooms = await RoomClient.listPlayableRooms();
            if (requestId !== this._activeRoomsRequestId || !this.scene.isActive('Lobby')) return;
            this._renderActiveRooms(rooms);
        } catch (_error) {
            if (requestId !== this._activeRoomsRequestId || !this.scene.isActive('Lobby')) return;
            this._renderActiveRooms([], 'Room list unavailable');
        } finally {
            if (requestId === this._activeRoomsRequestId) this._isRefreshingActiveRooms = false;
        }
    }

    _renderActiveRooms(rooms, statusText = '') {
        this._activeRoomRows.forEach((item) => item.destroy());
        this._activeRoomRows = [];
        if (!this._activeRoomsPanel || !this._activeRoomsStatusText) return;

        const width = Math.round(this.scale.width * 0.29);
        const visibleRooms = rooms.slice(0, ACTIVE_ROOM_ROW_LIMIT);
        if (visibleRooms.length === 0) {
            this._activeRoomsStatusText.setText(statusText || 'No active rooms').setColor('#ffffff');
            return;
        }

        this._activeRoomsStatusText.setText('').setColor('#ffffff');
        visibleRooms.forEach((room, index) => {
            const rowY = this.scale.height * 0.075 + index * this.scale.height * 0.13;
            const row = this.add.container(0, rowY);
            row.add(this.add.rectangle(0, 0, width, this.scale.height * 0.105, 0x120707, 0.65)
                .setOrigin(0, 0)
                .setStrokeStyle(1, 0xfff4bc, 0.5));
            row.add(this.add.text(width * 0.06, this.scale.height * 0.015, room.roomId, {
                fontFamily: 'Arial Black',
                fontSize: Math.round(this.scale.height * 0.036),
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5,
            }));
            const displayMapName = room.mapName.length > 8 ? `${room.mapName.slice(0, 8)}...` : room.mapName;
            const mapLabel = displayMapName ? ` - ${displayMapName}` : '';
            row.add(this.add.text(width * 0.06, this.scale.height * 0.062, `${room.clients}/${room.maxClients} PLAYERS${mapLabel}`, {
                fontFamily: 'Arial Black',
                fontSize: Math.round(this.scale.height * 0.018),
                color: '#fff4bc',
                stroke: '#000000',
                strokeThickness: 3,
            }));

            const joinText = this.add.text(width * 0.80, this.scale.height * 0.052, 'JOIN', {
                fontFamily: 'Arial Black',
                fontSize: Math.round(this.scale.height * 0.025),
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            joinText.on('pointerover', () => joinText.setColor('#fff4bc'));
            joinText.on('pointerout', () => joinText.setColor('#ffffff'));
            joinText.on('pointerdown', () => this._onJoinListedRoom(room.roomId));
            row.add(joinText);

            this._activeRoomsPanel.add(row);
            this._activeRoomRows.push(row);
        });
    }

    _setStatus(msg, color) {
        this._statusText?.setText(msg).setColor(color);
    }
}
