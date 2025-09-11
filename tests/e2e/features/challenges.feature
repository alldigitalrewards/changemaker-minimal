@challenges
Feature: Challenge lifecycle
  In order to run initiatives within a workspace
  As workspace members and admins
  We want to create challenges, submit entries, and review them

  Background:
    Given a workspace "Coral" with slug "coral" exists
    And I am logged in

  Scenario: Admin creates a challenge
    Given I have the admin role in workspace "coral"
    When I visit "/w/coral"
    And I click "Create Challenge"
    And I fill in "title" with "Reduce Plastic"
    And I fill in "description" with "Actions to reduce single-use plastic"
    And I submit the form
    Then I should see the challenge "Reduce Plastic" in the list

  Scenario: Participant submits to a challenge
    Given a challenge "Reduce Plastic" exists in workspace "coral"
    And I am a member of workspace "coral"
    When I open the challenge "Reduce Plastic"
    And I click "Submit Entry"
    And I fill in "content" with "Switched to reusable bottles"
    And I submit the form
    Then I should see my submission with status "PENDING"

  Scenario: Admin approves a submission
    Given a pending submission exists for challenge "Reduce Plastic" in workspace "coral"
    And I have the admin role in workspace "coral"
    When I review the submission
    And I choose "Approve"
    Then the submission status should change to "APPROVED"

  Scenario: Admin rejects a submission
    Given a pending submission exists for challenge "Reduce Plastic" in workspace "coral"
    And I have the admin role in workspace "coral"
    When I review the submission
    And I choose "Reject"
    Then the submission status should change to "REJECTED"

  Scenario: Non-admin cannot review submissions
    Given a pending submission exists for challenge "Reduce Plastic" in workspace "coral"
    And I am a non-admin member of workspace "coral"
    When I open the submission review UI
    Then I should see an authorization error or no review controls


