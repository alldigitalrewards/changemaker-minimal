@workspaces
Feature: Workspaces management
  In order to collaborate
  As an authenticated user
  I want to create, join, and access workspaces

  Background:
    Given I am logged in

  Scenario: Create a new workspace
    When I visit "/workspaces"
    And I open the "Create Workspace" dialog
    And I fill in "name" with "My Team Workspace"
    And I submit the dialog
    Then I should see "My Team Workspace" in my workspace list
    And I should be able to open "/w/my-team-workspace"

  Scenario: Join a workspace with a valid invite code
    When I open the "Join Workspace" dialog
    And I fill in "inviteCode" with a valid code
    And I submit the dialog
    Then I should see the workspace in my workspace list

  Scenario: Join a workspace with an invalid invite code
    When I open the "Join Workspace" dialog
    And I fill in "inviteCode" with "INVALID-CODE"
    And I submit the dialog
    Then I should see an error indicating the code is invalid

  Scenario: Access a workspace home page
    Given a workspace "Acme" with slug "acme" exists and I am a member
    When I visit "/w/acme"
    Then I should see the workspace dashboard

  Scenario: Access a workspace I am not a member of
    Given a workspace with slug "other" exists and I am not a member
    When I visit "/w/other"
    Then I should see a not-found or access denied message


