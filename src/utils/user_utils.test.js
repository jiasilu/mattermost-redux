// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {Preferences, General} from '../constants';
import {
    displayUsername,
    filterProfilesMatchingTerm,
    getSuggestionsSplitBy,
    getSuggestionsSplitByMultiple,
    includesAnAdminRole,
    applyRolesFilters,
} from 'utils/user_utils';

import TestHelper from 'test/test_helper';

describe('user utils', () => {
    describe('displayUsername', () => {
        const userObj = {
            id: 100,
            username: 'testUser',
            nickname: 'nick',
            first_name: 'test',
            last_name: 'user',
        };

        it('should return username', () => {
            assert.equal(displayUsername(userObj, 'UNKNOWN_PREFERENCE'), 'testUser');
        });

        it('should return nickname', () => {
            assert.equal(displayUsername(userObj, Preferences.DISPLAY_PREFER_NICKNAME), 'nick');
        });

        it('should return fullname when no nick name', () => {
            assert.equal(displayUsername({...userObj, nickname: ''}, Preferences.DISPLAY_PREFER_NICKNAME), 'test user');
        });

        it('should return username when no nick name and no full name', () => {
            assert.equal(displayUsername({...userObj, nickname: '', first_name: '', last_name: ''}, Preferences.DISPLAY_PREFER_NICKNAME), 'testUser');
        });

        it('should return fullname', () => {
            assert.equal(displayUsername(userObj, Preferences.DISPLAY_PREFER_FULL_NAME), 'test user');
        });

        it('should return username when no full name', () => {
            assert.equal(displayUsername({...userObj, first_name: '', last_name: ''}, Preferences.DISPLAY_PREFER_FULL_NAME), 'testUser');
        });

        it('should return default username string', () => {
            let noUserObj;
            assert.equal(displayUsername(noUserObj, 'UNKNOWN_PREFERENCE'), 'Someone');
        });

        it('should return empty string when user does not exist and useDefaultUserName param is false', () => {
            let noUserObj;
            assert.equal(displayUsername(noUserObj, 'UNKNOWN_PREFERENCE', false), '');
        });
    });

    describe('filterProfilesMatchingTerm', () => {
        const userA = {
            id: 100,
            username: 'testUser.split_10-',
            nickname: 'nick',
            first_name: 'First',
            last_name: 'Last1',
        };
        const userB = {
            id: 101,
            username: 'extraPerson-split',
            nickname: 'somebody',
            first_name: 'First',
            last_name: 'Last2',
            email: 'left@right.com',
        };
        const users = [userA, userB];

        it('should match all for empty filter', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, ''), [userA, userB]);
        });

        it('should filter out results which do not match', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'testBad'), []);
        });

        it('should match by username', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'testUser'), [userA]);
        });

        it('should match by split part of the username', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'split'), [userA, userB]);
            assert.deepEqual(filterProfilesMatchingTerm(users, '10'), [userA]);
        });

        it('should match by firstname', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'First'), [userA, userB]);
        });

        it('should match by lastname prefix', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'Last'), [userA, userB]);
        });

        it('should match by lastname fully', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'Last2'), [userB]);
        });

        it('should match by fullname prefix', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'First Last'), [userA, userB]);
        });

        it('should match by fullname fully', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'First Last1'), [userA]);
        });

        it('should match by fullname case-insensitive', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'first LAST'), [userA, userB]);
        });

        it('should match by nickname', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'some'), [userB]);
        });

        it('should not match by nickname substring', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'body'), []);
        });

        it('should match by email prefix', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'left'), [userB]);
        });

        it('should match by email domain', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'right'), [userB]);
        });

        it('should match by full email', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, 'left@right.com'), [userB]);
        });

        it('should ignore leading @ for username', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, '@testUser'), [userA]);
        });

        it('should ignore leading @ for firstname', () => {
            assert.deepEqual(filterProfilesMatchingTerm(users, '@first'), [userA, userB]);
        });
    });

    describe('Utils.getSuggestionsSplitBy', () => {
        test('correct suggestions when splitting by a character', () => {
            const term = 'one.two.three';
            const expectedSuggestions = ['one.two.three', '.two.three', 'two.three', '.three', 'three'];

            expect(getSuggestionsSplitBy(term, '.')).toEqual(expectedSuggestions);
        });
    });

    describe('Utils.getSuggestionsSplitByMultiple', () => {
        test('correct suggestions when splitting by multiple characters', () => {
            const term = 'one.two-three';
            const expectedSuggestions = ['one.two-three', '.two-three', 'two-three', '-three', 'three'];

            expect(getSuggestionsSplitByMultiple(term, ['.', '-'])).toEqual(expectedSuggestions);
        });
    });

    describe('Utils.applyRolesFilters', () => {
        const team = TestHelper.fakeTeamWithId();
        const adminUser = {...TestHelper.fakeUserWithId(), roles: `${General.SYSTEM_USER_ROLE} ${General.SYSTEM_ADMIN_ROLE}`};
        const nonAdminUser = {...TestHelper.fakeUserWithId(), roles: `${General.SYSTEM_USER_ROLE}`};
        const guestUser = {...TestHelper.fakeUserWithId(), roles: `${General.SYSTEM_GUEST_ROLE}`};

        it('Non admin user with non admin membership', () => {
            const nonAdminMembership = {...TestHelper.fakeTeamMember(nonAdminUser.id, team.id), scheme_admin: false, scheme_user: true};
            assert.equal(applyRolesFilters(nonAdminUser, [General.SYSTEM_USER_ROLE], nonAdminMembership), true);
            assert.equal(applyRolesFilters(nonAdminUser, [General.TEAM_USER_ROLE], nonAdminMembership), true);
            assert.equal(applyRolesFilters(nonAdminUser, [General.CHANNEL_USER_ROLE], nonAdminMembership), true);
            assert.equal(applyRolesFilters(nonAdminUser, [General.SYSTEM_ADMIN_ROLE, General.TEAM_ADMIN_ROLE, General.CHANNEL_ADMIN_ROLE], nonAdminMembership), false);
        });

        it('Non admin user with admin membership', () => {
            const adminMembership = {...TestHelper.fakeTeamMember(nonAdminUser.id, team.id), scheme_admin: true, scheme_user: true};
            assert.equal(applyRolesFilters(nonAdminUser, [General.SYSTEM_USER_ROLE], adminMembership), true);
            assert.equal(applyRolesFilters(nonAdminUser, [General.TEAM_ADMIN_ROLE], adminMembership), true);
            assert.equal(applyRolesFilters(nonAdminUser, [General.CHANNEL_ADMIN_ROLE], adminMembership), true);
            assert.equal(applyRolesFilters(nonAdminUser, [General.SYSTEM_ADMIN_ROLE, General.TEAM_USER_ROLE, General.CHANNEL_USER_ROLE], adminMembership), false);
        });

        it('Admin user with any membership', () => {
            const nonAdminMembership = {...TestHelper.fakeTeamMember(adminUser.id, team.id), scheme_admin: false, scheme_user: true};
            const adminMembership = {...TestHelper.fakeTeamMember(adminUser.id, team.id), scheme_admin: true, scheme_user: true};
            assert.equal(applyRolesFilters(adminUser, [General.SYSTEM_ADMIN_ROLE], nonAdminMembership), true);
            assert.equal(applyRolesFilters(adminUser, [General.SYSTEM_USER_ROLE, General.TEAM_USER_ROLE, General.TEAM_ADMIN_ROLE, General.CHANNEL_USER_ROLE, General.CHANNEL_ADMIN_ROLE], nonAdminMembership), false);
            assert.equal(applyRolesFilters(adminUser, [General.SYSTEM_ADMIN_ROLE], adminMembership), true);
            assert.equal(applyRolesFilters(adminUser, [General.SYSTEM_USER_ROLE, General.TEAM_USER_ROLE, General.TEAM_ADMIN_ROLE, General.CHANNEL_USER_ROLE, General.CHANNEL_ADMIN_ROLE], adminMembership), false);
        });

        it('Guest user with any membership', () => {
            const nonAdminMembership = {...TestHelper.fakeTeamMember(guestUser.id, team.id), scheme_admin: false, scheme_user: true};
            const adminMembership = {...TestHelper.fakeTeamMember(guestUser.id, team.id), scheme_admin: true, scheme_user: true};
            assert.equal(applyRolesFilters(guestUser, [General.SYSTEM_GUEST_ROLE], nonAdminMembership), true);
            assert.equal(applyRolesFilters(guestUser, [General.SYSTEM_USER_ROLE, General.TEAM_USER_ROLE, General.TEAM_ADMIN_ROLE, General.CHANNEL_USER_ROLE, General.CHANNEL_ADMIN_ROLE], nonAdminMembership), false);
            assert.equal(applyRolesFilters(guestUser, [General.SYSTEM_GUEST_ROLE], adminMembership), true);
            assert.equal(applyRolesFilters(guestUser, [General.SYSTEM_USER_ROLE, General.TEAM_USER_ROLE, General.TEAM_ADMIN_ROLE, General.CHANNEL_USER_ROLE, General.CHANNEL_ADMIN_ROLE], adminMembership), false);
        });
    });

    describe('includesAnAdminRole', () => {
        test('returns expected result', () => {
            [
                [General.SYSTEM_ADMIN_ROLE, true],
                [General.SYSTEM_USER_MANAGER_ROLE, true],
                [General.SYSTEM_READ_ONLY_ADMIN_ROLE, true],
                [General.SYSTEM_MANAGER_ROLE, true],
                ['non_existent', false],
                ['foo', false],
                ['bar', false],
            ].forEach(([role, expected]) => {
                const mockRoles = `foo ${role} bar`;
                const actual = includesAnAdminRole(mockRoles);
                assert.equal(actual, expected);
            });
        });
    });
});
